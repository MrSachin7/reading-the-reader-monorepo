using System.Text.Json;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

public sealed class ReaderShellSettingsService : IReaderShellSettingsService
{
    private static readonly JsonSerializerOptions SettingsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly SemaphoreSlim _gate = new(1, 1);
    private ReaderShellSettingsSnapshot _settings;

    public ReaderShellSettingsService()
    {
        _settings = TryLoadPersistedSettings() ?? ReaderShellSettingsSnapshots.CreateDefault();
    }

    public ReaderShellSettingsSnapshot GetSettings()
    {
        return _settings;
    }

    public async Task<ReaderShellSettingsSnapshot> UpdateSettingsAsync(
        ReaderShellSettingsSnapshot nextSettings,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(nextSettings);

        await _gate.WaitAsync(ct);
        try
        {
            _settings = nextSettings;
            await SavePersistedSettingsAsync(_settings, ct);
            return _settings;
        }
        finally
        {
            _gate.Release();
        }
    }

    private static string GetSettingsFilePath()
    {
        return Path.Combine(AppContext.BaseDirectory, "data", "reader-shell-settings.json");
    }

    private static ReaderShellSettingsSnapshot? TryLoadPersistedSettings()
    {
        var settingsFilePath = GetSettingsFilePath();
        if (!File.Exists(settingsFilePath))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(settingsFilePath);
            var persisted = JsonSerializer.Deserialize<PersistedReaderShellSettings>(json, SettingsJsonOptions);
            if (persisted is null)
            {
                return null;
            }

            return MergeWithDefaults(ReaderShellSettingsSnapshots.CreateDefault(), persisted);
        }
        catch
        {
            // Keep the built-in defaults if the persisted file is missing or invalid.
            return null;
        }
    }

    private static ReaderShellSettingsSnapshot MergeWithDefaults(
        ReaderShellSettingsSnapshot defaults,
        PersistedReaderShellSettings persisted)
    {
        return new ReaderShellSettingsSnapshot(
            MergeView(defaults.Reading, persisted.Reading),
            MergeView(defaults.ResearcherMirror, persisted.ResearcherMirror),
            MergeView(defaults.Replay, persisted.Replay));
    }

    private static ReaderShellViewSettings MergeView(
        ReaderShellViewSettings defaults,
        PersistedReaderShellViewSettings? persisted)
    {
        return new ReaderShellViewSettings(
            persisted?.PreserveContextOnIntervention ?? defaults.PreserveContextOnIntervention,
            persisted?.HighlightContext ?? defaults.HighlightContext,
            persisted?.DisplayGazePosition ?? defaults.DisplayGazePosition,
            persisted?.HighlightTokensBeingLookedAt ?? defaults.HighlightTokensBeingLookedAt,
            persisted?.ShowFixationHeatmap ?? defaults.ShowFixationHeatmap,
            persisted?.ShowToolbar ?? defaults.ShowToolbar,
            persisted?.ShowBackButton ?? defaults.ShowBackButton,
            persisted?.ShowLixScores ?? defaults.ShowLixScores);
    }

    private static async Task SavePersistedSettingsAsync(
        ReaderShellSettingsSnapshot settings,
        CancellationToken ct)
    {
        var settingsFilePath = GetSettingsFilePath();
        var directory = Path.GetDirectoryName(settingsFilePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = $"{settingsFilePath}.tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(
                stream,
                PersistedReaderShellSettings.FromSnapshot(settings),
                SettingsJsonOptions,
                ct);
        }

        File.Move(tempPath, settingsFilePath, overwrite: true);
    }

    private sealed class PersistedReaderShellSettings
    {
        public PersistedReaderShellViewSettings? Reading { get; set; }

        public PersistedReaderShellViewSettings? ResearcherMirror { get; set; }

        public PersistedReaderShellViewSettings? Replay { get; set; }

        public static PersistedReaderShellSettings FromSnapshot(ReaderShellSettingsSnapshot snapshot)
        {
            return new PersistedReaderShellSettings
            {
                Reading = PersistedReaderShellViewSettings.FromSnapshot(snapshot.Reading),
                ResearcherMirror = PersistedReaderShellViewSettings.FromSnapshot(snapshot.ResearcherMirror),
                Replay = PersistedReaderShellViewSettings.FromSnapshot(snapshot.Replay)
            };
        }
    }

    private sealed class PersistedReaderShellViewSettings
    {
        public bool? PreserveContextOnIntervention { get; set; }

        public bool? HighlightContext { get; set; }

        public bool? DisplayGazePosition { get; set; }

        public bool? HighlightTokensBeingLookedAt { get; set; }

        public bool? ShowFixationHeatmap { get; set; }

        public bool? ShowToolbar { get; set; }

        public bool? ShowBackButton { get; set; }

        public bool? ShowLixScores { get; set; }

        public static PersistedReaderShellViewSettings FromSnapshot(ReaderShellViewSettings snapshot)
        {
            return new PersistedReaderShellViewSettings
            {
                PreserveContextOnIntervention = snapshot.PreserveContextOnIntervention,
                HighlightContext = snapshot.HighlightContext,
                DisplayGazePosition = snapshot.DisplayGazePosition,
                HighlightTokensBeingLookedAt = snapshot.HighlightTokensBeingLookedAt,
                ShowFixationHeatmap = snapshot.ShowFixationHeatmap,
                ShowToolbar = snapshot.ShowToolbar,
                ShowBackButton = snapshot.ShowBackButton,
                ShowLixScores = snapshot.ShowLixScores
            };
        }
    }
}
