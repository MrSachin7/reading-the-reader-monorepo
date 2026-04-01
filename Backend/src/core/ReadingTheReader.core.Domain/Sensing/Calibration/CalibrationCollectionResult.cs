namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationCollectionResult(
    string Status,
    bool Succeeded,
    int Attempts,
    IReadOnlyList<string> Notes);
