using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.RealtimeMessenger;

public sealed class ExternalProviderRealtimeMessenger : IExternalProviderTransportAdapter
{
    private readonly ProviderWebSocketConnectionManager _connections;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ExternalProviderRealtimeMessenger(ProviderWebSocketConnectionManager connections)
    {
        _connections = connections;
    }

    public async ValueTask SendToProviderAsync<TPayload>(
        string connectionId,
        string messageType,
        TPayload payload,
        string? providerId = null,
        string? sessionId = null,
        string? correlationId = null,
        CancellationToken ct = default)
    {
        if (!_connections.TryGet(connectionId, out var socket) || socket is null || socket.State != WebSocketState.Open)
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

        var json = JsonSerializer.Serialize(envelope, _jsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        try
        {
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
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
