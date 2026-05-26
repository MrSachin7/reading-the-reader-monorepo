namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public interface IModuleProviderCoordinator
{
    bool IsExternalActive(string moduleId);

    ModuleProviderConnectionRecord? GetActiveProvider(string moduleId);

    event EventHandler<ModuleProviderSourceChangedEventArgs> SourceChanged;
}

public sealed class ModuleProviderSourceChangedEventArgs : EventArgs
{
    public ModuleProviderSourceChangedEventArgs(string moduleId, ModuleProviderConnectionRecord? activeProvider)
    {
        ModuleId = moduleId;
        ActiveProvider = activeProvider;
    }

    public string ModuleId { get; }

    public ModuleProviderConnectionRecord? ActiveProvider { get; }

    public bool IsExternalActive => ActiveProvider is not null;
}
