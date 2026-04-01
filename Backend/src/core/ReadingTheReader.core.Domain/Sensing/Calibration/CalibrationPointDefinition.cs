namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationPointDefinition(
    string PointId,
    string Label,
    float X,
    float Y);
