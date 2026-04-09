namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentPersistenceOptions
{
    public const string SectionName = "RealtimePersistence";

    public string Provider { get; set; } = "File";

    public string ActiveReplayDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "live-experiments");

    public string ReplayExportFilePath { get; set; } = Path.Combine(AppContext.BaseDirectory, "latest", "experiment-session-export.json");

    public string SavedReplayExportsDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "saved-files");

    public string ReplayRecoveryDirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "experiment-replay-recovery");

    public int ActiveReplaySaveIntervalMilliseconds { get; set; } = 10000;

    public int ReplayRecoveryFlushIntervalMilliseconds { get; set; } = 5000;
}
