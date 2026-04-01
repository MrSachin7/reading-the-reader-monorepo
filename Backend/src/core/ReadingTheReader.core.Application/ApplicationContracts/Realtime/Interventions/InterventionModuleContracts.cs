using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public static class ReadingInterventionModuleIds
{
    public const string FontFamily = "font-family";
    public const string FontSize = "font-size";
    public const string LineWidth = "line-width";
    public const string LineHeight = "line-height";
    public const string LetterSpacing = "letter-spacing";
    public const string ThemeMode = "theme-mode";
    public const string Palette = "palette";
    public const string ParticipantEditLock = "participant-edit-lock";
}

public static class ReadingInterventionValueKinds
{
    public const string String = "string";
    public const string Integer = "integer";
    public const string Number = "number";
    public const string Boolean = "boolean";
}

public sealed record ReadingInterventionParameterOption(
    string Value,
    string DisplayName,
    string? Description = null);

public sealed record ReadingInterventionParameterDescriptor(
    string Key,
    string DisplayName,
    string Description,
    string ValueKind,
    bool Required,
    string? DefaultValue = null,
    string? Unit = null,
    double? MinValue = null,
    double? MaxValue = null,
    double? Step = null,
    IReadOnlyList<ReadingInterventionParameterOption>? Options = null);

public sealed record ReadingInterventionModuleDescriptor(
    string ModuleId,
    string DisplayName,
    string Description,
    string Group,
    int SortOrder,
    IReadOnlyList<ReadingInterventionParameterDescriptor> Parameters);

public sealed record ReadingInterventionRequest(
    string ModuleId,
    IReadOnlyDictionary<string, string?> Parameters);

public sealed record ReadingInterventionExecutionContext(
    ReadingPresentationSnapshot CurrentPresentation,
    ReaderAppearanceSnapshot CurrentAppearance);

public sealed record ReadingInterventionValidationResult(
    bool IsValid,
    string? ErrorMessage,
    IReadOnlyDictionary<string, string?> NormalizedParameters);

public sealed record ReadingInterventionModuleExecutionResult(
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance,
    IReadOnlyDictionary<string, string?> NormalizedParameters);
