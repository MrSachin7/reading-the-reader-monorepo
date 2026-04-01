namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationValidationSnapshot(
    string Status,
    long? StartedAtUnixMs,
    long? UpdatedAtUnixMs,
    long? CompletedAtUnixMs,
    IReadOnlyList<CalibrationValidationPointState> Points,
    CalibrationValidationResult? Result,
    IReadOnlyList<string> Notes);
