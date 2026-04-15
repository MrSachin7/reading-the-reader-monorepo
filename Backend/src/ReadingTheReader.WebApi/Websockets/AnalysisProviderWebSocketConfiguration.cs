using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.RealtimeMessenger;

namespace ReadingTheReader.WebApi.Websockets;

public static class AnalysisProviderWebSocketConfiguration
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private sealed record InboundAnalysisProviderEnvelope(
        string Type,
        string? ProtocolVersion,
        string? ProviderId,
        string? SessionId,
        string? CorrelationId,
        long? SentAtUnixMs,
        JsonElement Payload);

    public static IServiceCollection AddAnalysisProviderWebSocketServices(this IServiceCollection services)
    {
        services.AddSingleton<AnalysisProviderWebSocketConnectionManager>();
        return services;
    }

    public static WebApplication ConfigureAnalysisProviderWebSockets(this WebApplication app)
    {
        app.Map("/ws/analysis-provider", async (
            HttpContext context,
            AnalysisProviderWebSocketConnectionManager connections,
            IAnalysisProviderIngressService ingress) =>
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

                    InboundAnalysisProviderEnvelope? envelope;
                    try
                    {
                        envelope = JsonSerializer.Deserialize<InboundAnalysisProviderEnvelope>(message, JsonOptions);
                    }
                    catch
                    {
                        await SendAsync(
                            socket,
                            AnalysisProviderMessageTypes.AnalysisProviderError,
                            new AnalysisProviderErrorRealtimePayload("unknown-provider", "invalid-envelope", "Analysis provider envelope is invalid."),
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
                            AnalysisProviderMessageTypes.AnalysisProviderError,
                            new AnalysisProviderErrorRealtimePayload("unknown-provider", "invalid-envelope", "Analysis provider message type is required."),
                            null,
                            null,
                            null,
                            context.RequestAborted);
                        break;
                    }

                    Console.WriteLine($"Analysis provider WebSocket command received. ConnectionId={connectionId}, Type={envelope.Type}");
                    var command = AnalysisProviderIngressCommandFactory.Create(connectionId, envelope.Type, envelope.Payload);
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
                await ingress.HandleAsync(new AnalysisProviderDisconnectRealtimeCommand(connectionId), CancellationToken.None);
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

        var envelope = new AnalysisProviderRealtimeEnvelope<TPayload>(
            messageType,
            AnalysisProviderProtocolVersions.V1,
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
