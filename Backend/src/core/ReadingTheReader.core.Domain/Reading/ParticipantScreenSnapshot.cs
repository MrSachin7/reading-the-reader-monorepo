namespace ReadingTheReader.core.Domain.Reading;

public sealed record ParticipantScreenSnapshot(
    int ScreenWidthPx,
    int ScreenHeightPx,
    int AvailableScreenWidthPx,
    int AvailableScreenHeightPx,
    int PhysicalScreenWidthPx,
    int PhysicalScreenHeightPx,
    double DevicePixelRatio)
{
    public ParticipantScreenSnapshot Copy()
    {
        return new ParticipantScreenSnapshot(
            Math.Max(ScreenWidthPx, 0),
            Math.Max(ScreenHeightPx, 0),
            Math.Max(AvailableScreenWidthPx, 0),
            Math.Max(AvailableScreenHeightPx, 0),
            Math.Max(PhysicalScreenWidthPx, 0),
            Math.Max(PhysicalScreenHeightPx, 0),
            DevicePixelRatio > 0 ? DevicePixelRatio : 1);
    }
}
