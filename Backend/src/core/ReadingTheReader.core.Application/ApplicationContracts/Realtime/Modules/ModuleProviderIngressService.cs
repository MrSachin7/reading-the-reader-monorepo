using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleProviderIngressService : IModuleProviderIngressService
{
    private static readonly ModuleProviderIngressResult Empty = new([], false);
    private static readonly ModuleProviderIngressResult Close = new([], true);

    private readonly IModuleRegistry _registry;
    private readonly IModuleProviderConnectionRegistry _connections;
    private readonly ModuleProviderOptions _options;
    private readonly IReadOnlyDictionary<string, IModuleInboundHandler> _handlersByModuleId;

    public ModuleProviderIngressService(
        IModuleRegistry registry,
        IModuleProviderConnectionRegistry connections,
        ModuleProviderOptions options,
        IEnumerable<IModuleInboundHandler> handlers)
    {
        _registry = registry;
        _connections = connections;
        _options = options;

        var map = new Dictionary<string, IModuleInboundHandler>(StringComparer.OrdinalIgnoreCase);
        foreach (var handler in handlers)
        {
            if (string.IsNullOrWhiteSpace(handler.ModuleId))
            {
                throw new InvalidOperationException(
                    $"Inbound handler {handler.GetType().FullName} has an empty ModuleId.");
            }

            if (!map.TryAdd(handler.ModuleId, handler))
            {
                throw new InvalidOperationException(
                    $"Duplicate inbound handler for module '{handler.ModuleId}'. " +
                    $"Existing: {map[handler.ModuleId].GetType().FullName}, " +
                    $"new: {handler.GetType().FullName}.");
            }
        }

        _handlersByModuleId = map;
    }

    public ValueTask<ModuleProviderIngressResult> HandleHelloAsync(
        string connectionId,
        ModuleProviderHelloPayload payload,
        CancellationToken ct = default)
    {
        var result = _connections.Register(connectionId, payload);

        if (!result.Succeeded)
        {
            var error = new ModuleProviderErrorPayload(
                payload?.ProviderId,
                result.ErrorCode ?? ModuleProviderErrorCodes.InternalError,
                result.ErrorMessage ?? "Module provider registration failed.",
                result.ErrorDetail);

            return ValueTask.FromResult(new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(ModuleProviderMessageTypes.Error, error, payload?.ProviderId)],
                ShouldCloseConnection: true));
        }

        var connection = result.Connection!;
        var heartbeatTimeoutMs = connection.ModuleIds
            .Select(_options.GetHeartbeatTimeoutMilliseconds)
            .DefaultIfEmpty(_options.DefaultHeartbeatTimeoutMilliseconds)
            .Min();

        var welcome = new ModuleProviderWelcomePayload(
            connection.ProviderId,
            connection.DisplayName,
            ModuleProviderProtocolVersions.V1,
            ModuleProviderConnectionStatuses.Active,
            connection.RegisteredAtUnixMs,
            heartbeatTimeoutMs,
            connection.ModuleIds);

        var responses = new List<ModuleProviderIngressResponse>
        {
            new(ModuleProviderMessageTypes.Welcome, welcome, connection.ProviderId)
        };

        foreach (var rejection in result.RejectedModules)
        {
            responses.Add(new ModuleProviderIngressResponse(
                ModuleProviderMessageTypes.Error,
                new ModuleProviderErrorPayload(
                    connection.ProviderId,
                    rejection.Code,
                    rejection.Message,
                    $"moduleId={rejection.ModuleId}"),
                connection.ProviderId));
        }

        return ValueTask.FromResult(new ModuleProviderIngressResult(responses, ShouldCloseConnection: false));
    }

    public ValueTask<ModuleProviderIngressResult> HandleHeartbeatAsync(
        string connectionId,
        ModuleProviderHeartbeatPayload payload,
        CancellationToken ct = default)
    {
        var result = _connections.AcceptHeartbeat(connectionId, payload);
        if (result.Succeeded)
        {
            return ValueTask.FromResult(Empty);
        }

        return ValueTask.FromResult(new ModuleProviderIngressResult(
            [
                new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(
                        payload?.ProviderId,
                        result.ErrorCode ?? ModuleProviderErrorCodes.InternalError,
                        result.ErrorMessage ?? "Heartbeat rejected.",
                        null),
                    payload?.ProviderId)
            ],
            ShouldCloseConnection: true));
    }

    public async ValueTask<ModuleProviderIngressResult> HandleInboundAsync(
        string connectionId,
        ModuleProviderInboundPayload payload,
        string? sessionId,
        string? correlationId,
        CancellationToken ct = default)
    {
        if (payload is null || string.IsNullOrWhiteSpace(payload.ModuleId))
        {
            return new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Inbound payload requires moduleId."))],
                ShouldCloseConnection: false);
        }

        if (!_connections.TryGetByConnectionId(connectionId, out var connection) || connection is null)
        {
            return new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.NotRegistered, "Inbound message received before successful hello."))],
                ShouldCloseConnection: true);
        }

        var moduleId = payload.ModuleId.Trim();
        if (!connection.ModuleIds.Contains(moduleId, StringComparer.OrdinalIgnoreCase))
        {
            return new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(
                        connection.ProviderId,
                        ModuleProviderErrorCodes.UnknownModule,
                        $"This connection did not register for module '{moduleId}'.",
                        null),
                    connection.ProviderId)],
                ShouldCloseConnection: false);
        }

        if (!_handlersByModuleId.TryGetValue(moduleId, out var handler))
        {
            return new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(
                        connection.ProviderId,
                        ModuleProviderErrorCodes.UnknownModule,
                        $"No inbound handler is registered for module '{moduleId}'.",
                        null),
                    connection.ProviderId)],
                ShouldCloseConnection: false);
        }

        var context = new ModuleProviderContext(
            connectionId,
            connection.ProviderId,
            moduleId,
            sessionId,
            correlationId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        try
        {
            await handler.HandleAsync(payload.MessageType ?? string.Empty, payload.PayloadJson ?? string.Empty, context, ct);
            return Empty;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Module inbound handler error. ModuleId={moduleId}, MessageType={payload.MessageType}, Error={ex.Message}");
            return new ModuleProviderIngressResult(
                [new ModuleProviderIngressResponse(
                    ModuleProviderMessageTypes.Error,
                    new ModuleProviderErrorPayload(
                        connection.ProviderId,
                        ModuleProviderErrorCodes.InternalError,
                        $"Module handler threw: {ex.Message}",
                        null),
                    connection.ProviderId)],
                ShouldCloseConnection: false);
        }
    }

    public ValueTask<ModuleProviderIngressResult> HandleErrorAsync(
        string connectionId,
        ModuleProviderErrorPayload payload,
        CancellationToken ct = default)
    {
        _connections.ReportError(connectionId, payload);
        return ValueTask.FromResult(Empty);
    }

    public ValueTask HandleDisconnectAsync(string connectionId, CancellationToken ct = default)
    {
        _connections.Disconnect(connectionId);
        return ValueTask.CompletedTask;
    }
}
