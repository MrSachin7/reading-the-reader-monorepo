namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;

public sealed class SaveExperimentSetupCommand
{
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
    public IReadOnlyList<SaveExperimentSetupItemCommand> Items { get; init; } = [];
}
