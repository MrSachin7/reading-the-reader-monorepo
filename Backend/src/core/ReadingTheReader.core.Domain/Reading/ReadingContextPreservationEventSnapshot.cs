namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingContextPreservationEventSnapshot(
    string Status,
    string AnchorSource,
    string? AnchorTokenId,
    string? AnchorBlockId,
    double? AnchorErrorPx,
    double? ViewportDeltaPx,
    long InterventionAppliedAtUnixMs,
    long MeasuredAtUnixMs,
    string? Reason)
{
    public ReadingContextPreservationEventSnapshot Copy()
    {
        return new ReadingContextPreservationEventSnapshot(
            NormalizeStatus(Status),
            NormalizeAnchorSource(AnchorSource),
            DomainText.NormalizeOptional(AnchorTokenId),
            DomainText.NormalizeOptional(AnchorBlockId),
            AnchorErrorPx,
            ViewportDeltaPx,
            InterventionAppliedAtUnixMs,
            MeasuredAtUnixMs,
            DomainText.NormalizeOptional(Reason));
    }

    public static string NormalizeStatus(string? status)
    {
        if (string.Equals(status?.Trim(), "degraded", StringComparison.OrdinalIgnoreCase))
        {
            return "degraded";
        }

        if (string.Equals(status?.Trim(), "failed", StringComparison.OrdinalIgnoreCase))
        {
            return "failed";
        }

        return "preserved";
    }

    public static string NormalizeAnchorSource(string? anchorSource)
    {
        if (string.Equals(anchorSource?.Trim(), "fallback-token", StringComparison.OrdinalIgnoreCase))
        {
            return "fallback-token";
        }

        if (string.Equals(anchorSource?.Trim(), "block-anchor", StringComparison.OrdinalIgnoreCase))
        {
            return "block-anchor";
        }

        if (string.Equals(anchorSource?.Trim(), "scroll-only", StringComparison.OrdinalIgnoreCase))
        {
            return "scroll-only";
        }

        return "active-token";
    }
}
