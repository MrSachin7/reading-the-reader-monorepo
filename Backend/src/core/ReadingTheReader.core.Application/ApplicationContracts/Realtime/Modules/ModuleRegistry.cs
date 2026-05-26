namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleRegistry : IModuleRegistry
{
    private readonly Dictionary<string, IModuleDefinition> _byId;
    private readonly IReadOnlyList<IModuleDefinition> _ordered;

    public ModuleRegistry(IEnumerable<IModuleDefinition> modules)
    {
        ArgumentNullException.ThrowIfNull(modules);

        _byId = new Dictionary<string, IModuleDefinition>(StringComparer.OrdinalIgnoreCase);
        var ordered = new List<IModuleDefinition>();

        foreach (var module in modules)
        {
            if (string.IsNullOrWhiteSpace(module.ModuleId))
            {
                throw new InvalidOperationException(
                    $"Module of type {module.GetType().FullName} has an empty ModuleId.");
            }

            if (!_byId.TryAdd(module.ModuleId, module))
            {
                var existing = _byId[module.ModuleId];
                throw new InvalidOperationException(
                    $"Duplicate ModuleId '{module.ModuleId}'. " +
                    $"Already registered by {existing.GetType().FullName}, " +
                    $"attempted re-registration by {module.GetType().FullName}.");
            }

            ordered.Add(module);
        }

        _ordered = ordered;
    }

    public IReadOnlyList<IModuleDefinition> Modules => _ordered;

    public IModuleDefinition? Find(string moduleId)
    {
        if (string.IsNullOrWhiteSpace(moduleId))
        {
            return null;
        }

        return _byId.TryGetValue(moduleId, out var module) ? module : null;
    }

    public bool Contains(string moduleId)
    {
        return !string.IsNullOrWhiteSpace(moduleId) && _byId.ContainsKey(moduleId);
    }
}
