using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record AnalysisProviderIngressResponse(
    string MessageType,
    object Payload,
    string? ProviderId = null,
    string? SessionId = null,
    string? CorrelationId = null);

public sealed record AnalysisProviderIngressHandlingResult(
    bool ShouldCloseConnection,
    IReadOnlyList<AnalysisProviderIngressResponse> Responses)
{
    public static AnalysisProviderIngressHandlingResult NoOp { get; } = new(false, []);
}

public interface IAnalysisProviderIngressService
{
    Task<AnalysisProviderIngressHandlingResult> HandleAsync(IAnalysisProviderIngressCommand command, CancellationToken ct = default);
}

public sealed class AnalysisProviderIngressService : IAnalysisProviderIngressService
{
    private readonly IAnalysisProviderConnectionRegistry _providerConnectionRegistry;
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly ExternalAnalysisProviderOptions _options;

    public AnalysisProviderIngressService(
        IAnalysisProviderConnectionRegistry providerConnectionRegistry,
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        ExternalAnalysisProviderOptions options)
    {
        _providerConnectionRegistry = providerConnectionRegistry;
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _options = options;
    }

    public async Task<AnalysisProviderIngressHandlingResult> HandleAsync(IAnalysisProviderIngressCommand command, CancellationToken ct = default)
    {
        return command switch
        {
            AnalysisProviderHelloRealtimeCommand hello => await HandleHelloAsync(hello, ct),
            AnalysisProviderHeartbeatRealtimeCommand heartbeat => HandleHeartbeat(heartbeat),
            AnalysisProviderSubmitAnalysisRealtimeCommand submit => await HandleSubmitAnalysisAsync(submit, ct),
            AnalysisProviderErrorReportedRealtimeCommand error => HandleProviderError(error),
            AnalysisProviderDisconnectRealtimeCommand disconnect => await HandleDisconnectAsync(disconnect, ct),
            InvalidAnalysisProviderRealtimeCommand invalid => ErrorAndClose(null, null, null, "invalid-provider-command", invalid.ErrorMessage),
            UnsupportedAnalysisProviderRealtimeCommand unsupported => ErrorAndClose(null, null, null, "unsupported-provider-command", $"Unsupported analysis provider message type '{unsupported.MessageType}'."),
            _ => ErrorAndClose(null, null, null, "unsupported-provider-command", "Unsupported analysis provider command.")
        };
    }

    private async Task<AnalysisProviderIngressHandlingResult> HandleHelloAsync(
        AnalysisProviderHelloRealtimeCommand command,
        CancellationToken ct)
    {
        var result = _providerConnectionRegistry.Register(command.ConnectionId, command.Payload);
        if (!result.Succeeded || result.Provider is null)
        {
            return ErrorAndClose(
                command.Payload.ProviderId,
                null,
                null,
                result.ErrorCode ?? "provider-registration-failed",
                result.ErrorMessage ?? "Analysis provider registration failed.");
        }

        await BroadcastExperimentStateAsync(ct);

        return new AnalysisProviderIngressHandlingResult(
            false,
            [
                new AnalysisProviderIngressResponse(
                    AnalysisProviderMessageTypes.AnalysisProviderWelcome,
                    new AnalysisProviderWelcomeRealtimePayload(
                        result.Provider.ProviderId,
                        result.Provider.DisplayName,
                        result.Provider.ProtocolVersion,
                        result.Provider.Status,
                        result.Provider.RegisteredAtUnixMs,
                        _options.HeartbeatTimeoutMilliseconds),
                    result.Provider.ProviderId)
            ]);
    }

    private AnalysisProviderIngressHandlingResult HandleHeartbeat(AnalysisProviderHeartbeatRealtimeCommand command)
    {
        var result = _providerConnectionRegistry.AcceptHeartbeat(command.ConnectionId, command.Payload);
        if (!result.Succeeded || result.Provider is null)
        {
            return ErrorAndClose(
                command.Payload.ProviderId,
                null,
                null,
                result.ErrorCode ?? "provider-heartbeat-failed",
                result.ErrorMessage ?? "Analysis provider heartbeat failed.");
        }

        return AnalysisProviderIngressHandlingResult.NoOp;
    }

    private AnalysisProviderIngressHandlingResult HandleProviderError(AnalysisProviderErrorReportedRealtimeCommand command)
    {
        _providerConnectionRegistry.ReportProviderError(command.ConnectionId, command.Payload);
        return AnalysisProviderIngressHandlingResult.NoOp;
    }

    private async Task<AnalysisProviderIngressHandlingResult> HandleSubmitAnalysisAsync(
        AnalysisProviderSubmitAnalysisRealtimeCommand command,
        CancellationToken ct)
    {
        if (!_providerConnectionRegistry.TryGetByConnectionId(command.ConnectionId, out var provider) || provider is null)
        {
            return ProviderError(command.Payload.ProviderId, command.Payload.SessionId, command.Payload.CorrelationId, "provider-not-registered", "Analysis provider is not registered.");
        }

        if (!string.Equals(provider.ProviderId, command.Payload.ProviderId, StringComparison.Ordinal))
        {
            return ProviderError(command.Payload.ProviderId, command.Payload.SessionId, command.Payload.CorrelationId, "provider-id-mismatch", "Analysis provider identity does not match the registered connection.");
        }

        try
        {
            await _runtimeAuthority.ApplyExternalEyeMovementAnalysisAsync(
                new ExternalEyeMovementAnalysisCommand(
                    command.Payload.ProviderId,
                    command.Payload.SessionId,
                    command.Payload.CorrelationId,
                    Math.Max(command.Payload.ObservedAtUnixMs, 0),
                    command.Payload.CurrentFixation?.Copy(),
                    command.Payload.CompletedFixation?.Copy(),
                    command.Payload.CompletedSaccade?.Copy(),
                    command.Payload.AnalysisState.Copy()),
                ct);

            return AnalysisProviderIngressHandlingResult.NoOp;
        }
        catch (InvalidOperationException ex)
        {
            return ProviderError(command.Payload.ProviderId, command.Payload.SessionId, command.Payload.CorrelationId, "analysis-rejected", ex.Message);
        }
    }

    private async Task<AnalysisProviderIngressHandlingResult> HandleDisconnectAsync(
        AnalysisProviderDisconnectRealtimeCommand command,
        CancellationToken ct)
    {
        _providerConnectionRegistry.Disconnect(command.ConnectionId);
        await BroadcastExperimentStateAsync(ct);
        return AnalysisProviderIngressHandlingResult.NoOp;
    }

    private Task BroadcastExperimentStateAsync(CancellationToken ct)
    {
        var snapshot = _experimentSessionQueryService.GetCurrentSnapshot();
        return _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentState, snapshot, ct).AsTask();
    }

    private static AnalysisProviderIngressHandlingResult ProviderError(
        string? providerId,
        string? sessionId,
        string? correlationId,
        string code,
        string message)
    {
        return new AnalysisProviderIngressHandlingResult(
            false,
            [
                new AnalysisProviderIngressResponse(
                    AnalysisProviderMessageTypes.AnalysisProviderError,
                    new AnalysisProviderErrorRealtimePayload(providerId ?? "unknown-provider", code, message),
                    providerId,
                    sessionId,
                    correlationId)
            ]);
    }

    private static AnalysisProviderIngressHandlingResult ErrorAndClose(
        string? providerId,
        string? sessionId,
        string? correlationId,
        string code,
        string message)
    {
        return new AnalysisProviderIngressHandlingResult(
            true,
            [
                new AnalysisProviderIngressResponse(
                    AnalysisProviderMessageTypes.AnalysisProviderError,
                    new AnalysisProviderErrorRealtimePayload(providerId ?? "unknown-provider", code, message),
                    providerId,
                    sessionId,
                    correlationId)
            ]);
    }
}
