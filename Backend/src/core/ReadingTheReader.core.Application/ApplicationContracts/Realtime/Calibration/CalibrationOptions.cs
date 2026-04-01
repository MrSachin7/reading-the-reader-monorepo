namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class CalibrationOptions
{
    public const string SectionName = "Calibration";

    public int PresetPointCount { get; set; } = 9;

    public string GetPatternName()
    {
        return PresetPointCount switch
        {
            9 => CalibrationPatterns.ScreenBasedNinePoint,
            13 => CalibrationPatterns.ScreenBasedThirteenPoint,
            16 => CalibrationPatterns.ScreenBasedSixteenPoint,
            _ => throw new InvalidOperationException(
                $"Unsupported calibration preset '{PresetPointCount}'. Supported values are 9, 13, and 16.")
        };
    }

    public IReadOnlyList<CalibrationPointDefinition> GetPointDefinitions()
    {
        return PresetPointCount switch
        {
            9 => CalibrationPresets.NinePoint,
            13 => CalibrationPresets.ThirteenPoint,
            16 => CalibrationPresets.SixteenPoint,
            _ => throw new InvalidOperationException(
                $"Unsupported calibration preset '{PresetPointCount}'. Supported values are 9, 13, and 16.")
        };
    }
}
