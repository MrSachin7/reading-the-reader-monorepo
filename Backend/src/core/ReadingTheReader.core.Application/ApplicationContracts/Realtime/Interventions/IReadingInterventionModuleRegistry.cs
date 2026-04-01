namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public interface IReadingInterventionModuleRegistry
{
    IReadOnlyList<ReadingInterventionModuleDescriptor> List();

    bool TryResolve(string? moduleId, out IReadingInterventionModule? module);

    IReadingInterventionModule GetRequired(string moduleId);
}
