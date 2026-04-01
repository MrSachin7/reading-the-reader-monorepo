namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public interface IReadingInterventionModule
{
    ReadingInterventionModuleDescriptor Descriptor { get; }

    ReadingInterventionValidationResult Validate(ReadingInterventionRequest request);

    ReadingInterventionModuleExecutionResult Execute(
        ReadingInterventionExecutionContext context,
        ReadingInterventionRequest request);
}
