namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

/// <summary>
/// Tracks backend-issued correlation ids and their send times so that an echoed
/// provider reply yields a single-clock round-trip latency. Used to measure the
/// cost of delegating a concern out-of-process (evaluation RQ2). Implementations
/// must be safe for concurrent use.
/// </summary>
public interface IModuleProviderRttTracker
{
    void MarkSent(string correlationId, long sentAtUnixMs);

    bool TryComplete(string correlationId, long receivedAtUnixMs, out double rttMs);
}
