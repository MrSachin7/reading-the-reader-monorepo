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

public static class CalibrationPresets
{
    private const float OuterMin = 0.1f;
    private const float OuterCenter = 0.5f;
    private const float OuterMax = 0.9f;
    private const float InnerHorizontalMin = 0.34f;
    private const float InnerHorizontalMax = 0.66f;
    private const float InnerVerticalMin = 0.24f;
    private const float InnerVerticalMax = 0.68f;

    // The 9-point preset is the shared base for larger presets and must cover the
    // full screen corners and edge midpoints.
    public static readonly IReadOnlyList<CalibrationPointDefinition> NinePoint =
    [
        new("center", "Center", OuterCenter, OuterCenter),
        new("top-left", "Top left", OuterMin, OuterMin),
        new("top-center", "Top center", OuterCenter, OuterMin),
        new("top-right", "Top right", OuterMax, OuterMin),
        new("right-center", "Right center", OuterMax, OuterCenter),
        new("bottom-right", "Bottom right", OuterMax, OuterMax),
        new("bottom-center", "Bottom center", OuterCenter, OuterMax),
        new("bottom-left", "Bottom left", OuterMin, OuterMax),
        new("left-center", "Left center", OuterMin, OuterCenter),
    ];

    public static readonly IReadOnlyList<CalibrationPointDefinition> ThirteenPoint =
    [
        ..NinePoint,
        new("upper-inner-left", "Upper inner left", InnerHorizontalMin, InnerVerticalMin),
        new("upper-inner-right", "Upper inner right", InnerHorizontalMax, InnerVerticalMin),
        new("lower-inner-right", "Lower inner right", InnerHorizontalMax, InnerVerticalMax),
        new("lower-inner-left", "Lower inner left", InnerHorizontalMin, InnerVerticalMax),
    ];

    public static readonly IReadOnlyList<CalibrationPointDefinition> SixteenPoint =
    [
        ..ThirteenPoint,
        new("upper-inner-center", "Upper inner center", OuterCenter, InnerVerticalMin),
        new("middle-inner-left", "Middle inner left", InnerHorizontalMin, OuterCenter),
        new("middle-inner-right", "Middle inner right", InnerHorizontalMax, OuterCenter),
    ];
}
