namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public sealed record CalibrationSettingsSnapshot(
    int PresetPointCount,
    string Pattern,
    IReadOnlyList<int> SupportedPointCounts,
    IReadOnlyList<CalibrationPointDefinition> Points,
    bool IsCalibrationRunning);
