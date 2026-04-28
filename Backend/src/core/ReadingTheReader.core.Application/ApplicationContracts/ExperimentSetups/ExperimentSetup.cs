namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

public sealed class ExperimentSetup
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public IReadOnlyList<ExperimentSetupItem> Items { get; init; } = [];
    public long CreatedAtUnixMs { get; init; }
    public long UpdatedAtUnixMs { get; init; }
}
