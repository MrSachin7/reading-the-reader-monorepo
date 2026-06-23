using System.Collections.Concurrent;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleProviderRttTracker : IModuleProviderRttTracker
{
    // Most outbound contexts never receive a matching reply (a provider only
    // responds when its own decision criteria are met), so unmatched entries are
    // expected. The cap and TTL keep the dictionary bounded under that one-sided load.
    private const int MaxTrackedEntries = 1024;
    private const long EntryTtlMs = 30_000;

    private readonly ConcurrentDictionary<string, long> _sentAtByCorrelationId = new(StringComparer.Ordinal);

    public void MarkSent(string correlationId, long sentAtUnixMs)
    {
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            return;
        }

        _sentAtByCorrelationId[correlationId] = sentAtUnixMs;

        if (_sentAtByCorrelationId.Count > MaxTrackedEntries)
        {
            PruneExpired(sentAtUnixMs);
        }
    }

    public bool TryComplete(string correlationId, long receivedAtUnixMs, out double rttMs)
    {
        rttMs = 0d;
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            return false;
        }

        if (!_sentAtByCorrelationId.TryRemove(correlationId, out var sentAtUnixMs))
        {
            return false;
        }

        rttMs = Math.Max(0d, receivedAtUnixMs - sentAtUnixMs);
        return true;
    }

    private void PruneExpired(long nowUnixMs)
    {
        foreach (var entry in _sentAtByCorrelationId)
        {
            if (nowUnixMs - entry.Value > EntryTtlMs)
            {
                _sentAtByCorrelationId.TryRemove(entry.Key, out _);
            }
        }
    }
}
