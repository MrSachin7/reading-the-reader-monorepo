namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationRunResult(
    string Status,
    bool Applied,
    int CalibrationPointCount,
    IReadOnlyList<CalibrationPointDefinition> AcceptedPoints,
    CalibrationValidationResult? Validation,
    IReadOnlyList<string> Notes);
