namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record ReadingGazeObservationCommand(
    long ObservedAtUnixMs,
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? TokenId,
    string? TokenText,
    string? TokenKind,
    string? BlockId,
    int? TokenIndex,
    int? LineIndex,
    int? BlockIndex,
    bool IsStale,
    string? StaleReason);
