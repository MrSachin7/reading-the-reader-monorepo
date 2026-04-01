namespace ReadingTheReader.core.Domain.Reading;

public sealed record ParticipantViewportSnapshot(
    bool IsConnected,
    double ScrollProgress,
    double ScrollTopPx,
    double ViewportWidthPx,
    double ViewportHeightPx,
    double ContentHeightPx,
    double ContentWidthPx,
    long UpdatedAtUnixMs)
{
    public static ParticipantViewportSnapshot Disconnected { get; } = new(false, 0, 0, 0, 0, 0, 0, 0);

    public ParticipantViewportSnapshot Copy()
    {
        return this with { };
    }
}
