namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public sealed class ReadingInterventionModuleRegistry : IReadingInterventionModuleRegistry
{
    private readonly IReadOnlyDictionary<string, IReadingInterventionModule> _modulesById;
    private readonly IReadOnlyList<ReadingInterventionModuleDescriptor> _descriptors;

    public ReadingInterventionModuleRegistry(IEnumerable<IReadingInterventionModule> modules)
    {
        ArgumentNullException.ThrowIfNull(modules);

        var resolvedModules = modules.ToArray();
        var duplicateIds = resolvedModules
            .GroupBy(module => module.Descriptor.ModuleId, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .OrderBy(id => id, StringComparer.Ordinal)
            .ToArray();

        if (duplicateIds.Length > 0)
        {
            throw new InvalidOperationException(
                $"Duplicate reading intervention modules were registered: {string.Join(", ", duplicateIds)}");
        }

        _modulesById = resolvedModules.ToDictionary(
            module => module.Descriptor.ModuleId,
            module => module,
            StringComparer.Ordinal);

        _descriptors = resolvedModules
            .Select(module => module.Descriptor)
            .OrderBy(descriptor => descriptor.Group, StringComparer.Ordinal)
            .ThenBy(descriptor => descriptor.SortOrder)
            .ThenBy(descriptor => descriptor.DisplayName, StringComparer.Ordinal)
            .ToArray();
    }

    public IReadOnlyList<ReadingInterventionModuleDescriptor> List() => _descriptors;

    public bool TryResolve(string? moduleId, out IReadingInterventionModule? module)
    {
        if (string.IsNullOrWhiteSpace(moduleId))
        {
            module = null;
            return false;
        }

        return _modulesById.TryGetValue(moduleId.Trim(), out module);
    }

    public IReadingInterventionModule GetRequired(string moduleId)
    {
        if (TryResolve(moduleId, out var module) && module is not null)
        {
            return module;
        }

        throw new KeyNotFoundException($"Unknown reading intervention module '{moduleId}'.");
    }
}
