namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

public sealed class ExperimentSetup
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Status { get; init; } = ExperimentSetupStatuses.Draft;
    public string OrderMode { get; init; } = ExperimentSetupOrderModes.Fixed;
    public string DefaultFontFamily { get; init; } = "merriweather";
    public int DefaultFontSizePx { get; init; } = 18;
    public int DefaultLineWidthPx { get; init; } = 680;
    public double DefaultLineHeight { get; init; } = 1.7;
    public double DefaultLetterSpacingEm { get; init; } = 0.02;
    public bool DefaultEditableByExperimenter { get; init; } = true;
    public string DecisionProviderId { get; init; } = "manual";
    public string DecisionExecutionMode { get; init; } = "advisory";
    public bool CalibrationRequired { get; init; } = true;
    public IReadOnlyList<ExperimentSetupItem> Items { get; init; } = [];
    public long CreatedAtUnixMs { get; init; }
    public long UpdatedAtUnixMs { get; init; }
}

public static class ExperimentSetupStatuses
{
    public const string Draft = "draft";
    public const string Ready = "ready";
    public const string Archived = "archived";

    public static string Normalize(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            Ready => Ready,
            Archived => Archived,
            _ => Draft
        };
    }
}

public static class ExperimentSetupOrderModes
{
    public const string Fixed = "fixed";
    public const string Random = "random";

    public static string Normalize(string? value)
    {
        return string.Equals(value?.Trim(), Random, StringComparison.OrdinalIgnoreCase)
            ? Random
            : Fixed;
    }
}
