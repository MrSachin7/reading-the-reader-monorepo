namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IReadingInterventionModuleRegistry
{
    IReadOnlyList<ReadingInterventionModuleDescriptor> List();

    bool TryResolve(string? moduleId, out IReadingInterventionModule? module);

    IReadingInterventionModule GetRequired(string moduleId);
}
