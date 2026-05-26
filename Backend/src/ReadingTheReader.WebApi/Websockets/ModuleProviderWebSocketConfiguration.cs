using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.RealtimeMessenger;

namespace ReadingTheReader.WebApi.Websockets;

public static class ModuleProviderWebSocketConfiguration
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private sealed record InboundEnvelope(
        string Type,
        string? ProtocolVersion,
        string? ProviderId,
        string? SessionId,
        string? CorrelationId,
        long? SentAtUnixMs,
        JsonElement Payload);

    public static IServiceCollection AddModuleProviderWebSocketServices(this IServiceCollection services)
    {
        services.AddSingleton<ModuleProviderWebSocketConnectionManager>();
        return services;
    }

    public static WebApplication ConfigureModuleProviderWebSockets(this WebApplication app)
    {
        app.Map("/ws/module-provider", async (
            HttpContext context,
            ModuleProviderWebSocketConnectionManager connections,
            IModuleProviderIngressService ingress) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using var socket = await context.WebSockets.AcceptWebSocketAsync();
            var connectionId = connections.Add(socket);
            var buffer = new byte[8 * 1024];

            try
            {
                while (socket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
                {
                    var message = await ReadTextMessageAsync(socket, buffer, context.RequestAborted);
                    if (message is null)
                    {
                        break;
                    }

                    InboundEnvelope? envelope;
                    try
                    {
                        envelope = JsonSerializer.Deserialize<InboundEnvelope>(message, JsonOptions);
                    }
                    catch (Exception ex)
                    {
                        await SendErrorAsync(
                            socket,
                            new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Module provider envelope is invalid.", ex.Message),
                            context.RequestAborted);
                        break;
                    }

                    if (envelope is null || string.IsNullOrWhiteSpace(envelope.Type))
                    {
                        await SendErrorAsync(
                            socket,
                            new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Module provider envelope type is required."),
                            context.RequestAborted);
                        break;
                    }

                    Console.WriteLine($"Module provider envelope received. ConnectionId={connectionId}, Type={envelope.Type}");

                    var result = await DispatchAsync(connectionId, envelope, ingress, context.RequestAborted);

                    foreach (var response in result.Responses)
                    {
                        await SendAsync(
                            socket,
                            response.MessageType,
                            response.Payload,
                            response.ProviderId,
                            response.SessionId,
                            response.CorrelationId,
                            context.RequestAborted);
                    }

                    if (result.ShouldCloseConnection)
                    {
                        break;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Request aborted.
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Module provider socket error. ConnectionId={connectionId}, Error={ex.Message}");
            }
            finally
            {
                await ingress.HandleDisconnectAsync(connectionId, CancellationToken.None);
                connections.Remove(connectionId);
                if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
                {
                    try
                    {
                        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    }
                    catch
                    {
                        // Ignore close failures.
                    }
                }
            }
        });

        return app;
    }

    private static async ValueTask<ModuleProviderIngressResult> DispatchAsync(
        string connectionId,
        InboundEnvelope envelope,
        IModuleProviderIngressService ingress,
        CancellationToken ct)
    {
        switch (envelope.Type)
        {
            case ModuleProviderMessageTypes.Hello:
                {
                    var hello = envelope.Payload.Deserialize<ModuleProviderHelloPayload>(JsonOptions);
                    if (hello is null)
                    {
                        return new ModuleProviderIngressResult(
                            [new ModuleProviderIngressResponse(
                                ModuleProviderMessageTypes.Error,
                                new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Hello payload is required."))],
                            ShouldCloseConnection: true);
                    }

                    return await ingress.HandleHelloAsync(connectionId, hello, ct);
                }

            case ModuleProviderMessageTypes.Heartbeat:
                {
                    var heartbeat = envelope.Payload.Deserialize<ModuleProviderHeartbeatPayload>(JsonOptions);
                    if (heartbeat is null)
                    {
                        return new ModuleProviderIngressResult(
                            [new ModuleProviderIngressResponse(
                                ModuleProviderMessageTypes.Error,
                                new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Heartbeat payload is required."))],
                            ShouldCloseConnection: false);
                    }

                    return await ingress.HandleHeartbeatAsync(connectionId, heartbeat, ct);
                }

            case ModuleProviderMessageTypes.Inbound:
                {
                    var inbound = envelope.Payload.Deserialize<InboundPayloadWire>(JsonOptions);
                    if (inbound is null)
                    {
                        return new ModuleProviderIngressResult(
                            [new ModuleProviderIngressResponse(
                                ModuleProviderMessageTypes.Error,
                                new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, "Inbound payload is required."))],
                            ShouldCloseConnection: false);
                    }

                    var rawPayload = inbound.Payload.ValueKind == JsonValueKind.Undefined
                        ? string.Empty
                        : inbound.Payload.GetRawText();

                    var payload = new ModuleProviderInboundPayload(
                        inbound.ModuleId ?? string.Empty,
                        inbound.MessageType ?? string.Empty,
                        rawPayload);

                    return await ingress.HandleInboundAsync(
                        connectionId,
                        payload,
                        envelope.SessionId,
                        envelope.CorrelationId,
                        ct);
                }

            case ModuleProviderMessageTypes.Error:
                {
                    var error = envelope.Payload.Deserialize<ModuleProviderErrorPayload>(JsonOptions);
                    if (error is null)
                    {
                        return new ModuleProviderIngressResult([], ShouldCloseConnection: false);
                    }

                    return await ingress.HandleErrorAsync(connectionId, error, ct);
                }

            default:
                return new ModuleProviderIngressResult(
                    [new ModuleProviderIngressResponse(
                        ModuleProviderMessageTypes.Error,
                        new ModuleProviderErrorPayload(null, ModuleProviderErrorCodes.InvalidPayload, $"Unknown envelope type '{envelope.Type}'."))],
                    ShouldCloseConnection: false);
        }
    }

    private sealed record InboundPayloadWire(string? ModuleId, string? MessageType, JsonElement Payload);

    private static Task SendErrorAsync(WebSocket socket, ModuleProviderErrorPayload payload, CancellationToken ct)
    {
        return SendAsync(socket, ModuleProviderMessageTypes.Error, payload, payload.ProviderId, null, null, ct);
    }

    private static async Task SendAsync(
        WebSocket socket,
        string messageType,
        object payload,
        string? providerId,
        string? sessionId,
        string? correlationId,
        CancellationToken ct)
    {
        if (socket.State != WebSocketState.Open)
        {
            return;
        }

        var envelope = new ModuleProviderEnvelope<object>(
            messageType,
            ModuleProviderProtocolVersions.V1,
            providerId,
            sessionId,
            correlationId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            payload);

        var json = JsonSerializer.Serialize(envelope, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        try
        {
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
        }
        catch
        {
            // Ignore send failures.
        }
    }

    private static async Task<string?> ReadTextMessageAsync(WebSocket socket, byte[] buffer, CancellationToken ct)
    {
        using var ms = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(buffer, ct);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                continue;
            }

            ms.Write(buffer, 0, result.Count);

            if (result.EndOfMessage)
            {
                return Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
            }
        }
    }
}
