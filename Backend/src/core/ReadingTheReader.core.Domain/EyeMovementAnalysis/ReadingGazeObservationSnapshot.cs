namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public static class ReadingGazeObservationStaleReasons
{
    public const string None = "none";
    public const string NoPoint = "no-point";
    public const string PointStale = "point-stale";
    public const string OutsideReadingArea = "outside-reading-area";
    public const string NoTokenHit = "no-token-hit";

    public static IReadOnlyList<string> All { get; } =
        [None, NoPoint, PointStale, OutsideReadingArea, NoTokenHit];
}

public sealed record ReadingGazeObservationSnapshot(
    long ObservedAtUnixMs,
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? TokenId,
    string? BlockId,
    int? TokenIndex,
    int? LineIndex,
    int? BlockIndex,
    bool IsStale,
    string StaleReason)
{
    public static ReadingGazeObservationSnapshot Empty { get; } = new(
        0,
        false,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        false,
        ReadingGazeObservationStaleReasons.None);

    public ReadingGazeObservationSnapshot Copy()
    {
        return this with { };
    }
}
