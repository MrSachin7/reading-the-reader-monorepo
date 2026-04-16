using System.Text.Json;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;

public static class SensingModes
{
    public const string EyeTracker = "eyeTracker";
    public const string Mouse = "mouse";

    public static string Normalize(string? mode)
    {
        if (string.Equals(mode, Mouse, StringComparison.OrdinalIgnoreCase))
        {
            return Mouse;
        }

        if (string.Equals(mode, EyeTracker, StringComparison.OrdinalIgnoreCase))
        {
            return EyeTracker;
        }

        throw new ArgumentException($"Unsupported sensing mode '{mode}'.", nameof(mode));
    }
}

public sealed record SensingModeSettingsSnapshot(
    string Mode,
    bool CanChangeMode,
    string? BlockReason)
{
    public static SensingModeSettingsSnapshot Create(
        string mode,
        bool canChangeMode,
        string? blockReason)
    {
        return new SensingModeSettingsSnapshot(
            SensingModes.Normalize(mode),
            canChangeMode,
            blockReason);
    }
}

public interface ISensingModeSettingsService
{
    string CurrentMode { get; }

    SensingModeSettingsSnapshot GetSettings(bool canChangeMode = true, string? blockReason = null);

    Task<SensingModeSettingsSnapshot> UpdateModeAsync(
        string mode,
        bool canChangeMode = true,
        string? blockReason = null,
        CancellationToken ct = default);
}

public sealed class SensingModeSettingsService : ISensingModeSettingsService
{
    private static readonly JsonSerializerOptions SettingsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly SemaphoreSlim _gate = new(1, 1);
    private string _mode;

    public SensingModeSettingsService()
    {
        _mode = TryLoadPersistedSettings()?.Mode ?? SensingModes.EyeTracker;
    }

    public string CurrentMode => _mode;

    public SensingModeSettingsSnapshot GetSettings(bool canChangeMode = true, string? blockReason = null)
    {
        return SensingModeSettingsSnapshot.Create(_mode, canChangeMode, blockReason);
    }

    public async Task<SensingModeSettingsSnapshot> UpdateModeAsync(
        string mode,
        bool canChangeMode = true,
        string? blockReason = null,
        CancellationToken ct = default)
    {
        if (!canChangeMode)
        {
            throw new InvalidOperationException(blockReason ?? "Sensing mode cannot be changed right now.");
        }

        var normalizedMode = SensingModes.Normalize(mode);

        await _gate.WaitAsync(ct);
        try
        {
            _mode = normalizedMode;
            await SavePersistedSettingsAsync(_mode, ct);
            return SensingModeSettingsSnapshot.Create(_mode, canChangeMode, blockReason);
        }
        finally
        {
            _gate.Release();
        }
    }

    private static string GetSettingsFilePath()
    {
        return Path.Combine(AppContext.BaseDirectory, "data", "sensing-mode-settings.json");
    }

    private static PersistedSensingModeSettings? TryLoadPersistedSettings()
    {
        var settingsFilePath = GetSettingsFilePath();
        if (!File.Exists(settingsFilePath))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(settingsFilePath);
            var persisted = JsonSerializer.Deserialize<PersistedSensingModeSettings>(json, SettingsJsonOptions);
            if (persisted is null)
            {
                return null;
            }

            persisted.Mode = SensingModes.Normalize(persisted.Mode);
            return persisted;
        }
        catch
        {
            return null;
        }
    }

    private static async Task SavePersistedSettingsAsync(string mode, CancellationToken ct)
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
                new PersistedSensingModeSettings { Mode = mode },
                SettingsJsonOptions,
                ct);
        }

        File.Move(tempPath, settingsFilePath, overwrite: true);
    }

    private sealed class PersistedSensingModeSettings
    {
        public string Mode { get; set; } = SensingModes.EyeTracker;
    }
}
