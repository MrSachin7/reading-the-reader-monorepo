namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationValidationCollectionResult(
    string Status,
    bool Succeeded,
    int SampleCount,
    IReadOnlyList<string> Notes);
