namespace ReadingTheReader.core.Domain.Reading;

public sealed record ApplyInterventionCommand(
    string Source,
    string Trigger,
    string Reason,
    ReadingPresentationPatch Presentation,
    ReaderAppearancePatch Appearance,
    string? ModuleId = null,
    IReadOnlyDictionary<string, string?>? Parameters = null)
{
    public ApplyInterventionCommand Copy()
    {
        return new ApplyInterventionCommand(
            Source,
            Trigger,
            Reason,
            Presentation with { },
            Appearance with { },
            DomainText.NormalizeOptional(ModuleId),
            DomainText.CloneParameters(Parameters));
    }
}
