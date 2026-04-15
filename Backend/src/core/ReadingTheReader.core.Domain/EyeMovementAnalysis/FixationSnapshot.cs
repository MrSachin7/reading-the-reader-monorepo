namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public sealed record FixationSnapshot(
    string TokenId,
    string? BlockId,
    int TokenIndex,
    int LineIndex,
    int BlockIndex,
    long StartedAtUnixMs,
    long LastObservedAtUnixMs,
    long DurationMs,
    long? EndedAtUnixMs = null)
{
    public FixationSnapshot Copy()
    {
        return this with { };
    }
}
