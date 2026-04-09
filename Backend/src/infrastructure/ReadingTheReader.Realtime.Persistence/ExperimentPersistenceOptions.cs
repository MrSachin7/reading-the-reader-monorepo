namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentPersistenceOptions
{
    public const string SectionName = "RealtimePersistence";

    public string Provider { get; set; } = "InMemory";

    public string SnapshotFilePath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-session-snapshot.json");

    public string ReplayExportFilePath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-session-export.json");

    public string SavedReplayExportsDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "saved-files");

    public string ReplayRecoveryDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-replay-recovery");

    public int CheckpointIntervalMilliseconds { get; set; } = 2000;

    public int ReplayRecoveryFlushIntervalMilliseconds { get; set; } = 5000;
}
