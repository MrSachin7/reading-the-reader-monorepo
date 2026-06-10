namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public static class SaccadeDirections
{
    public const string Forward = "forward";
    public const string Backward = "backward";
    public const string LineChangeForward = "line-change-forward";
    public const string LineChangeBackward = "line-change-backward";
    public const string Unknown = "unknown";

    public static bool IsRegression(string? direction)
    {
        return string.Equals(direction, Backward, StringComparison.Ordinal) ||
               string.Equals(direction, LineChangeBackward, StringComparison.Ordinal);
    }
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
    public bool IsRegression => SaccadeDirections.IsRegression(Direction);

    public SaccadeSnapshot Copy()
    {
        return this with { };
    }
}
