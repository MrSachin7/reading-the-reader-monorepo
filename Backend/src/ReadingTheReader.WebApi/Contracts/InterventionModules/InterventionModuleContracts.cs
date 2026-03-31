namespace ReadingTheReader.WebApi.Contracts.InterventionModules;

public sealed record InterventionModuleParameterOptionResponse(
    string Value,
    string DisplayName,
    string? Description);

public sealed record InterventionModuleParameterResponse(
    string Key,
    string DisplayName,
    string Description,
    string ValueKind,
    bool Required,
    string? DefaultValue,
    string? Unit,
    double? MinValue,
    double? MaxValue,
    double? Step,
    IReadOnlyList<InterventionModuleParameterOptionResponse> Options);

public sealed record InterventionModuleDescriptorResponse(
    string ModuleId,
    string DisplayName,
    string Description,
    string Group,
    int SortOrder,
    IReadOnlyList<InterventionModuleParameterResponse> Parameters);
