namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationComputeResult(
    string Status,
    bool Applied,
    int CalibrationPointCount,
    IReadOnlyList<CalibrationPointDefinition> AcceptedPoints,
    IReadOnlyList<string> Notes);
