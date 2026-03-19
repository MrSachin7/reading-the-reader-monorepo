namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IReadingInterventionRuntime
{
    InterventionExecutionResult? Apply(
        ReadingPresentationSnapshot currentPresentation,
        ApplyInterventionCommand command,
        long appliedAtUnixMs);
}

public sealed record InterventionExecutionResult(
    ReadingPresentationSnapshot Presentation,
    InterventionEventSnapshot Event);
