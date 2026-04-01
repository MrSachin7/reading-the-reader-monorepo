using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public interface IReadingInterventionRuntime
{
    InterventionExecutionResult? Apply(
        ReadingPresentationSnapshot currentPresentation,
        ReaderAppearanceSnapshot currentAppearance,
        ApplyInterventionCommand command,
        long appliedAtUnixMs);
}

public sealed record InterventionExecutionResult(
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance,
    InterventionEventSnapshot Event);
