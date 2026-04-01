namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationValidationResult(
    bool Passed,
    string Quality,
    double? AverageAccuracyDegrees,
    double? AveragePrecisionDegrees,
    int SampleCount,
    IReadOnlyList<CalibrationValidationPointResult> Points,
    IReadOnlyList<string> Notes);
