namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentPersistenceOptions
{
    public const string SectionName = "RealtimePersistence";

    public string Provider { get; set; } = "InMemory";

    public string SnapshotFilePath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-session-snapshot.json");

    public string ReplayExportFilePath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-session-export.json");

    public string SavedReplayExportsDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-replay-exports");

    public int CheckpointIntervalMilliseconds { get; set; } = 2000;
}
