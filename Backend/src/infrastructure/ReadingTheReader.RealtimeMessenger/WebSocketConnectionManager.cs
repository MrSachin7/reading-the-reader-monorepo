using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace ReadingTheReader.RealtimeMessenger;

public sealed class WebSocketConnectionManager
{
    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();

    public string Add(WebSocket socket)
    {
        var id = Guid.NewGuid().ToString("N");
        _sockets[id] = socket;
        return id;
    }

    public bool Remove(string id) => _sockets.TryRemove(id, out _);

    public bool TryGet(string id, out WebSocket? socket)
    {
        if (_sockets.TryGetValue(id, out var found))
        {
            socket = found;
            return true;
        }

        socket = null;
        return false;
    }

    public IEnumerable<WebSocket> All => _sockets.Values;

    public int Count => _sockets.Count;
}
