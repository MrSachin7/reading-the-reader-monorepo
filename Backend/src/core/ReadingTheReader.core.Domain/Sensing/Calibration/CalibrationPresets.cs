namespace ReadingTheReader.core.Domain.Sensing.Calibration;

public static class CalibrationPresets
{
    private const float OuterMin = 0.1f;
    private const float OuterCenter = 0.5f;
    private const float OuterMax = 0.9f;
    private const float InnerHorizontalMin = 0.34f;
    private const float InnerHorizontalMax = 0.66f;
    private const float InnerVerticalMin = 0.24f;
    private const float InnerVerticalMax = 0.68f;

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
        .. NinePoint,
        new("upper-inner-left", "Upper inner left", InnerHorizontalMin, InnerVerticalMin),
        new("upper-inner-right", "Upper inner right", InnerHorizontalMax, InnerVerticalMin),
        new("lower-inner-right", "Lower inner right", InnerHorizontalMax, InnerVerticalMax),
        new("lower-inner-left", "Lower inner left", InnerHorizontalMin, InnerVerticalMax),
    ];

    public static readonly IReadOnlyList<CalibrationPointDefinition> SixteenPoint =
    [
        .. ThirteenPoint,
        new("upper-inner-center", "Upper inner center", OuterCenter, InnerVerticalMin),
        new("middle-inner-left", "Middle inner left", InnerHorizontalMin, OuterCenter),
        new("middle-inner-right", "Middle inner right", InnerHorizontalMax, OuterCenter),
    ];
}
