using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.RealtimeMessenger;

namespace ReadingTheReader.WebApi.Websockets;

public static class ProviderWebSocketConfiguration
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private sealed record InboundProviderEnvelope(
        string Type,
        string? ProtocolVersion,
        string? ProviderId,
        string? SessionId,
        string? CorrelationId,
        long? SentAtUnixMs,
        JsonElement Payload);

    public static IServiceCollection AddProviderWebSocketServices(this IServiceCollection services)
    {
        services.AddSingleton<ProviderWebSocketConnectionManager>();
        return services;
    }

    public static WebApplication ConfigureProviderWebSockets(this WebApplication app)
    {
        app.Map("/ws/provider", async (
            HttpContext context,
            ProviderWebSocketConnectionManager connections,
            IProviderIngressService ingress) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using var socket = await context.WebSockets.AcceptWebSocketAsync();
            var connectionId = connections.Add(socket);
            var buffer = new byte[4 * 1024];

            try
            {
                while (socket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
                {
                    var message = await ReadTextMessageAsync(socket, buffer, context.RequestAborted);
                    if (message is null)
                    {
                        break;
                    }

                    InboundProviderEnvelope? envelope;
                    try
                    {
                        envelope = JsonSerializer.Deserialize<InboundProviderEnvelope>(message, JsonOptions);
                    }
                    catch
                    {
                        await SendAsync(
                            socket,
                            ProviderMessageTypes.ProviderError,
                            new ProviderErrorRealtimePayload("unknown-provider", "invalid-envelope", "Provider envelope is invalid."),
                            null,
                            null,
                            null,
                            context.RequestAborted);
                        break;
                    }

                    if (envelope is null || string.IsNullOrWhiteSpace(envelope.Type))
                    {
                        await SendAsync(
                            socket,
                            ProviderMessageTypes.ProviderError,
                            new ProviderErrorRealtimePayload("unknown-provider", "invalid-envelope", "Provider message type is required."),
                            null,
                            null,
                            null,
                            context.RequestAborted);
                        break;
                    }

                    Console.WriteLine($"Provider WebSocket command received. ConnectionId={connectionId}, Type={envelope.Type}");
                    var command = ProviderIngressCommandFactory.Create(connectionId, envelope.Type, envelope.Payload);
                    var result = await ingress.HandleAsync(command, context.RequestAborted);

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
            finally
            {
                await ingress.HandleAsync(new ProviderDisconnectRealtimeCommand(connectionId), CancellationToken.None);
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

    private static async Task SendAsync<TPayload>(
        WebSocket socket,
        string messageType,
        TPayload payload,
        string? providerId,
        string? sessionId,
        string? correlationId,
        CancellationToken ct)
    {
        if (socket.State != WebSocketState.Open)
        {
            return;
        }

        var envelope = new ProviderRealtimeEnvelope<TPayload>(
            messageType,
            ProviderProtocolVersions.V1,
            providerId,
            sessionId,
            correlationId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            payload);

        var json = JsonSerializer.Serialize(envelope, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
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
