namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentPersistenceOptions
{
    public const string SectionName = "RealtimePersistence";

    public string Provider { get; set; } = "InMemory";

    public string DataDirectoryPath { get; set; } = PersistencePathResolver.GetPersistenceDataDirectory();

    public string? SnapshotFilePath { get; set; }

    public string? ReplayExportFilePath { get; set; }

    public string? SavedReplayExportsDirectoryPath { get; set; }

    public string? SessionJournalDirectoryPath { get; set; }

    public int JournalGazeBatchSize { get; set; } = 64;

    public int JournalGazeFlushIntervalMilliseconds { get; set; } = 250;

    public int CheckpointIntervalMilliseconds { get; set; } = 2000;

    public string ResolveDataDirectoryPath()
    {
        return ResolveConfiguredPath(DataDirectoryPath, PersistencePathResolver.GetPersistenceDataDirectory());
    }

    public string ResolveSnapshotFilePath()
    {
        return ResolveDataPath(SnapshotFilePath, "experiment-session-snapshot.json");
    }

    public string ResolveReplayExportFilePath()
    {
        return ResolveDataPath(ReplayExportFilePath, "experiment-session-export.json");
    }

    public string ResolveSavedReplayExportsDirectoryPath()
    {
        return ResolveDataPath(SavedReplayExportsDirectoryPath, "experiment-replay-exports");
    }

    public string ResolveSessionJournalDirectoryPath()
    {
        return ResolveDataPath(SessionJournalDirectoryPath, "experiment-session-journal");
    }

    private string ResolveDataPath(string? configuredPath, string defaultRelativePath)
    {
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return PersistencePathResolver.ResolvePath(configuredPath);
        }

        return Path.Combine(ResolveDataDirectoryPath(), defaultRelativePath);
    }

    private static string ResolveConfiguredPath(string configuredPath, string defaultPath)
    {
        return string.IsNullOrWhiteSpace(configuredPath)
            ? defaultPath
            : PersistencePathResolver.ResolvePath(configuredPath);
    }
}
