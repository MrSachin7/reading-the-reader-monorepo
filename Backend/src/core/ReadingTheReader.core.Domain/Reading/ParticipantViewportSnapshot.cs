namespace ReadingTheReader.core.Domain.Reading;

public sealed record ParticipantViewportSnapshot(
    bool IsConnected,
    double ScrollProgress,
    double ScrollTopPx,
    double ViewportWidthPx,
    double ViewportHeightPx,
    double ContentHeightPx,
    double ContentWidthPx,
    long UpdatedAtUnixMs,
    int ActivePageIndex = 0,
    int PageCount = 1,
    long? LastPageTurnAtUnixMs = null)
{
    public static ParticipantViewportSnapshot Disconnected { get; } = new(false, 0, 0, 0, 0, 0, 0, 0, 0, 1, null);

    public ParticipantViewportSnapshot Copy()
    {
        return this with
        {
            ActivePageIndex = Math.Max(ActivePageIndex, 0),
            PageCount = Math.Max(PageCount, 1),
            LastPageTurnAtUnixMs = LastPageTurnAtUnixMs.HasValue ? Math.Max(LastPageTurnAtUnixMs.Value, 0) : null
        };
    }
}
