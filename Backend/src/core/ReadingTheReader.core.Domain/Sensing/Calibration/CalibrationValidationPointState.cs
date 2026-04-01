namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationValidationPointState(
    string PointId,
    string Label,
    float X,
    float Y,
    string Status,
    int SampleCount,
    long? CollectedAtUnixMs,
    IReadOnlyList<string> Notes);
