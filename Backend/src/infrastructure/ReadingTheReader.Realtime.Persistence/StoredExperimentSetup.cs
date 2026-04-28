namespace ReadingTheReader.Realtime.Persistence;

internal sealed class StoredExperimentSetup
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public List<StoredExperimentSetupItem> Items { get; init; } = [];
    public long CreatedAtUnixMs { get; init; }
    public long UpdatedAtUnixMs { get; init; }
}
