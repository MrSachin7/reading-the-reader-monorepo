namespace ReadingTheReader.core.Domain.Sensing.Calibration;

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
