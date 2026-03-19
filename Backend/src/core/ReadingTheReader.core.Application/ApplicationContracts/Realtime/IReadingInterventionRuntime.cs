namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

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
