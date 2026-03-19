using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.RealtimeMessenger;

namespace ReadingTheReader.WebApi.Websockets;

public static class WebSocketConfiguration
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private sealed record InboundRealtimeEnvelope(string Type, JsonElement Payload);

    /// <summary>
    /// Registers WebSocket services in the DI container
    /// </summary>
    public static IServiceCollection AddWebSocketServices(this IServiceCollection services)
    {
        services.AddSingleton<WebSocketConnectionManager>();
        services.AddSingleton<WebSocketRealtimeMessenger>();
        services.AddSingleton<IClientBroadcasterAdapter>(sp => sp.GetRequiredService<WebSocketRealtimeMessenger>());

        return services;
    }

    /// <summary>
    /// Configures WebSocket endpoints and middleware
    /// </summary>
    public static WebApplication ConfigureWebSockets(this WebApplication app)
    {
        app.UseWebSockets();

        app.Map("/ws", async (HttpContext context, WebSocketConnectionManager connections, IExperimentSessionManager sessionManager) =>
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

                    InboundRealtimeEnvelope? envelope;
                    try
                    {
                        envelope = JsonSerializer.Deserialize<InboundRealtimeEnvelope>(message, JsonOptions);
                    }
                    catch
                    {
                        continue;
                    }

                    if (envelope is null || string.IsNullOrWhiteSpace(envelope.Type))
                    {
                        continue;
                    }

                    Console.WriteLine($"WebSocket command received. ConnectionId={connectionId}, Type={envelope.Type}");
                    await sessionManager.HandleInboundMessageAsync(connectionId, envelope.Type, envelope.Payload, context.RequestAborted);
                }
            }
            catch (OperationCanceledException)
            {
                // Request aborted.
            }
            finally
            {
                await sessionManager.HandleClientDisconnectedAsync(connectionId, CancellationToken.None);
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
