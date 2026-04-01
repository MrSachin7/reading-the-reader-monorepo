namespace ReadingTheReader.core.Domain.Reading;

public sealed record InterventionEventSnapshot(
    Guid Id,
    string Source,
    string Trigger,
    string Reason,
    long AppliedAtUnixMs,
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
            AppliedPresentation.Copy(),
            AppliedAppearance.Copy(),
            DomainText.NormalizeOptional(ModuleId),
            DomainText.CloneParameters(Parameters));
    }
}
