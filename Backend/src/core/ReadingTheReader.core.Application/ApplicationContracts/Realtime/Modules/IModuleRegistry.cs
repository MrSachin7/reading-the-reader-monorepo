namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public interface IModuleRegistry
{
    IReadOnlyList<IModuleDefinition> Modules { get; }

    IModuleDefinition? Find(string moduleId);

    bool Contains(string moduleId);
}
