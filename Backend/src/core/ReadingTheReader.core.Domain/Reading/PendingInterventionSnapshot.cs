namespace ReadingTheReader.core.Domain.Reading;

public static class PendingInterventionStatuses
{
    public const string Queued = "queued";
    public const string Applied = "applied";
    public const string Superseded = "superseded";
}

public sealed record PendingInterventionSnapshot(
    Guid Id,
    string Status,
    string RequestedBoundary,
    string? FallbackBoundary,
    long FallbackAfterMs,
    long QueuedAtUnixMs,
    long? AppliedAtUnixMs,
    long? SupersededAtUnixMs,
    long? WaitDurationMs,
    bool IsFallbackEligible,
    string? ResolutionReason,
    ApplyInterventionCommand Intervention)
{
    public PendingInterventionSnapshot Copy()
    {
        return new PendingInterventionSnapshot(
            Id,
            NormalizeStatus(Status),
            ReadingInterventionPolicySnapshot.NormalizeBoundary(
                RequestedBoundary,
                ReadingInterventionCommitBoundaries.ParagraphEnd),
            string.IsNullOrWhiteSpace(FallbackBoundary)
                ? null
                : ReadingInterventionPolicySnapshot.NormalizeBoundary(
                    FallbackBoundary,
                    ReadingInterventionCommitBoundaries.SentenceEnd),
            Math.Max(FallbackAfterMs, 0),
            Math.Max(QueuedAtUnixMs, 0),
            AppliedAtUnixMs.HasValue ? Math.Max(AppliedAtUnixMs.Value, 0) : null,
            SupersededAtUnixMs.HasValue ? Math.Max(SupersededAtUnixMs.Value, 0) : null,
            WaitDurationMs.HasValue ? Math.Max(WaitDurationMs.Value, 0) : null,
            IsFallbackEligible,
            DomainText.NormalizeOptional(ResolutionReason),
            Intervention.Copy());
    }

    public static string NormalizeStatus(string? status)
    {
        if (string.Equals(status?.Trim(), PendingInterventionStatuses.Applied, StringComparison.OrdinalIgnoreCase))
        {
            return PendingInterventionStatuses.Applied;
        }

        if (string.Equals(status?.Trim(), PendingInterventionStatuses.Superseded, StringComparison.OrdinalIgnoreCase))
        {
            return PendingInterventionStatuses.Superseded;
        }

        return PendingInterventionStatuses.Queued;
    }
}
