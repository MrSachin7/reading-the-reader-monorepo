namespace ReadingTheReader.core.Domain.Reading;

public sealed record InterventionEventSnapshot(
    Guid Id,
    string Source,
    string Trigger,
    string Reason,
    long AppliedAtUnixMs,
    string AppliedBoundary,
    long? WaitDurationMs,
    ReadingPresentationSnapshot AppliedPresentation,
    ReaderAppearanceSnapshot AppliedAppearance,
    string? ModuleId = null,
    IReadOnlyDictionary<string, string?>? Parameters = null)
{
    public InterventionEventSnapshot Copy()
    {
        return new InterventionEventSnapshot(
            Id,
            Source,
            Trigger,
            Reason,
            AppliedAtUnixMs,
            ReadingInterventionPolicySnapshot.NormalizeBoundary(
                AppliedBoundary,
                ReadingInterventionCommitBoundaries.Immediate),
            WaitDurationMs.HasValue ? Math.Max(WaitDurationMs.Value, 0) : null,
            AppliedPresentation.Copy(),
            AppliedAppearance.Copy(),
            DomainText.NormalizeOptional(ModuleId),
            DomainText.CloneParameters(Parameters));
    }
}
