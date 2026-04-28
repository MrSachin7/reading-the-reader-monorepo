namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;

public sealed class UpdateExperimentSetupCommand
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public IReadOnlyList<UpdateExperimentSetupItemCommand> Items { get; init; } = [];
}
