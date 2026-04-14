namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingContextPreservationEventSnapshot(
    string Status,
    string AnchorSource,
    string? AnchorSentenceId,
    string? AnchorTokenId,
    string? AnchorBlockId,
    double? AnchorErrorPx,
    double? ViewportDeltaPx,
    string CommitBoundary,
    long? WaitDurationMs,
    long InterventionAppliedAtUnixMs,
    long MeasuredAtUnixMs,
    string? Reason)
{
    public ReadingContextPreservationEventSnapshot Copy()
    {
        return new ReadingContextPreservationEventSnapshot(
            NormalizeStatus(Status),
            NormalizeAnchorSource(AnchorSource),
            DomainText.NormalizeOptional(AnchorSentenceId),
            DomainText.NormalizeOptional(AnchorTokenId),
            DomainText.NormalizeOptional(AnchorBlockId),
            AnchorErrorPx,
            ViewportDeltaPx,
            ReadingInterventionPolicySnapshot.NormalizeBoundary(
                CommitBoundary,
                ReadingInterventionCommitBoundaries.Immediate),
            WaitDurationMs.HasValue ? Math.Max(WaitDurationMs.Value, 0) : null,
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
        if (string.Equals(anchorSource?.Trim(), "sentence-anchor", StringComparison.OrdinalIgnoreCase))
        {
            return "sentence-anchor";
        }

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
