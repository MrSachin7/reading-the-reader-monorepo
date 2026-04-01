namespace ReadingTheReader.core.Domain.Sensing.Calibration;

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
