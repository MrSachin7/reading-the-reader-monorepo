using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.RealtimeMessenger;

public sealed class WebSocketRealtimeMessenger : IClientBroadcasterAdapter
{
    private readonly WebSocketConnectionManager _connections;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public WebSocketRealtimeMessenger(WebSocketConnectionManager connections)
    {
        _connections = connections;
    }

    public int ConnectedClients => _connections.Count;

    public ValueTask SendAsync<T>(string messageType, T payload, CancellationToken ct = default)
    {
        return BroadcastAsync(messageType, payload, ct);
    }

    public async ValueTask BroadcastAsync<T>(string messageType, T payload, CancellationToken ct = default)
    {
        var buffer = SerializeEnvelope(messageType, payload);

        foreach (var socket in _connections.All)
        {
            if (socket.State != WebSocketState.Open)
            {
                continue;
            }

            try
            {
                await socket.SendAsync(buffer, WebSocketMessageType.Text, true, ct);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                // Ignore disconnected sockets and send failures.
            }
        }
    }

    public async ValueTask SendToClientAsync<T>(string connectionId, string messageType, T payload, CancellationToken ct = default)
    {
        if (!_connections.TryGet(connectionId, out var socket) || socket is null || socket.State != WebSocketState.Open)
        {
            return;
        }

        var buffer = SerializeEnvelope(messageType, payload);

        try
        {
            await socket.SendAsync(buffer, WebSocketMessageType.Text, true, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch
        {
            // Ignore disconnected sockets and send failures.
        }
    }

    private ArraySegment<byte> SerializeEnvelope<T>(string messageType, T payload)
    {
        var envelope = new RealtimeMessageEnvelope<T>(
            messageType,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            payload
        );

        var json = JsonSerializer.Serialize(envelope, _jsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        return new ArraySegment<byte>(bytes);
    }
}
