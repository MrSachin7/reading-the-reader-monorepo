using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.RealtimeMessenger;

public sealed class ModuleProviderRealtimeMessenger : IModuleProviderTransportAdapter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly ModuleProviderWebSocketConnectionManager _connections;

    public ModuleProviderRealtimeMessenger(ModuleProviderWebSocketConnectionManager connections)
    {
        _connections = connections;
    }

    public async ValueTask SendEnvelopeAsync<TPayload>(
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

        var envelope = new ModuleProviderEnvelope<TPayload>(
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
