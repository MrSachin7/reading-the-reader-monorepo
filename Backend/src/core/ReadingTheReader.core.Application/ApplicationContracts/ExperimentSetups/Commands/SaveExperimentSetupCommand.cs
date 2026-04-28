namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;

public sealed class SaveExperimentSetupCommand
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public IReadOnlyList<SaveExperimentSetupItemCommand> Items { get; init; } = [];
}
