namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public static class CalibrationPatterns
{
    public const string ScreenBasedNinePoint = "screen-based-nine-point";
    public const string ScreenBasedThirteenPoint = "screen-based-thirteen-point";
    public const string ScreenBasedSixteenPoint = "screen-based-sixteen-point";
}

public sealed record CalibrationPointDefinition(
    string PointId,
    string Label,
    float X,
    float Y);

public sealed record CalibrationPointState(
    string PointId,
    string Label,
    float X,
    float Y,
    string Status,
    int Attempts,
    long? CollectedAtUnixMs,
    string? HardwareStatus,
    IReadOnlyList<string> Notes);

public sealed record CalibrationCollectionResult(
    string Status,
    bool Succeeded,
    int Attempts,
    IReadOnlyList<string> Notes);

public sealed record CalibrationValidationCollectionResult(
    string Status,
    bool Succeeded,
    int SampleCount,
    IReadOnlyList<string> Notes);

public sealed record CalibrationComputeResult(
    string Status,
    bool Applied,
    int CalibrationPointCount,
    IReadOnlyList<CalibrationPointDefinition> AcceptedPoints,
    IReadOnlyList<string> Notes);

public sealed record CalibrationValidationPointState(
    string PointId,
    string Label,
    float X,
    float Y,
    string Status,
    int SampleCount,
    long? CollectedAtUnixMs,
    IReadOnlyList<string> Notes);

public sealed record CalibrationValidationPointResult(
    string PointId,
    string Label,
    float X,
    float Y,
    double? AverageAccuracyDegrees,
    double? AveragePrecisionDegrees,
    int SampleCount,
    string Quality,
    IReadOnlyList<string> Notes);

public sealed record CalibrationValidationResult(
    bool Passed,
    string Quality,
    double? AverageAccuracyDegrees,
    double? AveragePrecisionDegrees,
    int SampleCount,
    IReadOnlyList<CalibrationValidationPointResult> Points,
    IReadOnlyList<string> Notes);

public sealed record CalibrationValidationSnapshot(
    string Status,
    long? StartedAtUnixMs,
    long? UpdatedAtUnixMs,
    long? CompletedAtUnixMs,
    IReadOnlyList<CalibrationValidationPointState> Points,
    CalibrationValidationResult? Result,
    IReadOnlyList<string> Notes);

public sealed record CalibrationRunResult(
    string Status,
    bool Applied,
    int CalibrationPointCount,
    IReadOnlyList<CalibrationPointDefinition> AcceptedPoints,
    CalibrationValidationResult? Validation,
    IReadOnlyList<string> Notes);

public sealed record CalibrationSessionSnapshot(
    Guid? SessionId,
    string Status,
    string Pattern,
    long? StartedAtUnixMs,
    long? UpdatedAtUnixMs,
    long? CompletedAtUnixMs,
    IReadOnlyList<CalibrationPointState> Points,
    CalibrationRunResult? Result,
    CalibrationValidationSnapshot Validation,
    IReadOnlyList<string> Notes);

public sealed record CalibrationSettingsSnapshot(
    int PresetPointCount,
    string Pattern,
    IReadOnlyList<int> SupportedPointCounts,
    IReadOnlyList<CalibrationPointDefinition> Points,
    bool IsCalibrationRunning);

public static class CalibrationSessionSnapshots
{
    public static CalibrationSessionSnapshot CreateIdle(string pattern = CalibrationPatterns.ScreenBasedNinePoint)
    {
        return new CalibrationSessionSnapshot(
            null,
            "idle",
            pattern,
            null,
            null,
            null,
            [],
            null,
            CreateIdleValidation(),
            []);
    }

    public static CalibrationValidationSnapshot CreateIdleValidation()
    {
        return new CalibrationValidationSnapshot(
            "idle",
            null,
            null,
            null,
            [],
            null,
            []);
    }

    public static bool IsApplied(CalibrationSessionSnapshot? snapshot)
    {
        return snapshot?.Result?.Applied == true;
    }

    public static bool IsReadyForSession(CalibrationSessionSnapshot? snapshot)
    {
        return snapshot?.Result?.Applied == true &&
               snapshot.Validation.Result?.Passed == true;
    }
}
