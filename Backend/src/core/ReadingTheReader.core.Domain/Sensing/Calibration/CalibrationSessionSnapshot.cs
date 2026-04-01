namespace ReadingTheReader.core.Domain.Sensing.Calibration;

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
