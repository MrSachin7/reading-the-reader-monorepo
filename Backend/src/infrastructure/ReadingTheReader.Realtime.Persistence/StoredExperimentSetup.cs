namespace ReadingTheReader.Realtime.Persistence;

internal sealed class StoredExperimentSetup
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? Status { get; init; }
    public string? OrderMode { get; init; }
    public string? DefaultFontFamily { get; init; }
    public int? DefaultFontSizePx { get; init; }
    public int? DefaultLineWidthPx { get; init; }
    public double? DefaultLineHeight { get; init; }
    public double? DefaultLetterSpacingEm { get; init; }
    public bool? DefaultEditableByExperimenter { get; init; }
    public string? DecisionProviderId { get; init; }
    public string? DecisionExecutionMode { get; init; }
    public bool? CalibrationRequired { get; init; }
    public List<StoredExperimentSetupItem> Items { get; init; } = [];
    public long CreatedAtUnixMs { get; init; }
    public long UpdatedAtUnixMs { get; init; }
}
