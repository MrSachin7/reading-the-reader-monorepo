namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public static class SaccadeDirections
{
    public const string Forward = "forward";
    public const string Backward = "backward";
    public const string LineChangeForward = "line-change-forward";
    public const string LineChangeBackward = "line-change-backward";
    public const string Unknown = "unknown";
}

public sealed record SaccadeSnapshot(
    string? FromTokenId,
    string? ToTokenId,
    string? FromBlockId,
    string? ToBlockId,
    int? FromTokenIndex,
    int? ToTokenIndex,
    int LineDelta,
    int BlockDelta,
    long StartedAtUnixMs,
    long EndedAtUnixMs,
    long DurationMs,
    string Direction)
{
    public SaccadeSnapshot Copy()
    {
        return this with { };
    }
}
