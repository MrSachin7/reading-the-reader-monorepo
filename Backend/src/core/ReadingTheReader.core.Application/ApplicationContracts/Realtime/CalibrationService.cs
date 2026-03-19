using System.Text.Json;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class CalibrationService : ICalibrationService
{
    private const float AcceptedPointMatchTolerance = 0.04f;
    private static readonly int[] SupportedPointCounts = [9, 13, 16];
    private static readonly JsonSerializerOptions SettingsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentSessionManager _experimentSessionManager;
    private readonly CalibrationOptions _calibrationOptions;
    private readonly SemaphoreSlim _gate = new(1, 1);

    private CalibrationSessionSnapshot _snapshot;

    public CalibrationService(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentSessionManager experimentSessionManager,
        CalibrationOptions calibrationOptions)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _experimentSessionManager = experimentSessionManager;
        _calibrationOptions = calibrationOptions;
        TryLoadPersistedSettings(_calibrationOptions);
        _snapshot = BuildIdleSnapshot();
    }

    public CalibrationSessionSnapshot GetCurrentSnapshot()
    {
        return _snapshot;
    }

    public CalibrationSettingsSnapshot GetSettings()
    {
        return BuildSettingsSnapshot();
    }

    public async Task<CalibrationSessionSnapshot> StartCalibrationAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            if (string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase))
            {
                await _eyeTrackerAdapter.CancelCalibrationAsync(ct);
            }

            await _experimentSessionManager.PauseGazeStreamingAsync(ct);
            await _eyeTrackerAdapter.BeginCalibrationAsync(ct);

            var pattern = _calibrationOptions.GetPatternName();
            var points = _calibrationOptions.GetPointDefinitions();
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _snapshot = new CalibrationSessionSnapshot(
                Guid.NewGuid(),
                "running",
                pattern,
                now,
                now,
                null,
                points
                    .Select(point => new CalibrationPointState(
                        point.PointId,
                        point.Label,
                        point.X,
                        point.Y,
                        "pending",
                        0,
                        null,
                        null,
                        []))
                    .ToArray(),
                null,
                ["Calibration mode entered on the selected eye tracker."]);

            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message);
            await BroadcastSnapshotAsync(ct);
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSessionSnapshot> CollectPointAsync(string pointId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(pointId))
        {
            throw new ArgumentException("pointId is required.", nameof(pointId));
        }

        await _gate.WaitAsync(ct);
        try
        {
            EnsureRunningSession();

            var pointIndex = FindPointIndex(pointId);
            var point = _snapshot.Points[pointIndex];

            _snapshot = _snapshot with
            {
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Points = ReplacePoint(pointIndex, point with
                {
                    Status = "collecting",
                    HardwareStatus = null,
                    Notes = ["Collecting calibration data from the eye tracker."]
                })
            };
            await BroadcastSnapshotAsync(ct);

            var result = await _eyeTrackerAdapter.CollectCalibrationDataAsync(point.X, point.Y, ct);
            var collectedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nextPoint = point with
            {
                Status = result.Succeeded ? "collected" : "failed",
                Attempts = result.Attempts,
                CollectedAtUnixMs = collectedAtUnixMs,
                HardwareStatus = result.Status,
                Notes = result.Notes
            };

            _snapshot = _snapshot with
            {
                Status = result.Succeeded ? "running" : "failed",
                UpdatedAtUnixMs = collectedAtUnixMs,
                CompletedAtUnixMs = result.Succeeded ? null : collectedAtUnixMs,
                Points = ReplacePoint(pointIndex, nextPoint),
                Notes = result.Succeeded
                    ? [$"Collected data for {point.Label.ToLowerInvariant()}."]
                    : [$"Collection failed for {point.Label.ToLowerInvariant()}. Restart calibration and try again."]
            };

            if (!result.Succeeded)
            {
                await _eyeTrackerAdapter.CancelCalibrationAsync(ct);
                await SafeResumeGazeStreamingAsync(ct);
            }

            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeCancelCalibrationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message, _snapshot.Points);
            await BroadcastSnapshotAsync(ct);
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSessionSnapshot> FinishCalibrationAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            EnsureRunningSession();

            if (_snapshot.Points.Any(point => !string.Equals(point.Status, "collected", StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("All calibration points must be collected before calibration can be applied.");
            }

            var result = await _eyeTrackerAdapter.ComputeAndApplyCalibrationAsync(ct);
            var completedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var completionNotes = BuildCompletionNotes(result);
            _snapshot = _snapshot with
            {
                Status = result.Applied ? "completed" : "failed",
                UpdatedAtUnixMs = completedAtUnixMs,
                CompletedAtUnixMs = completedAtUnixMs,
                Result = new CalibrationRunResult(
                    result.Status,
                    result.Applied,
                    result.CalibrationPointCount,
                    result.AcceptedPoints,
                    result.Notes),
                Notes = completionNotes
            };

            await _eyeTrackerAdapter.CancelCalibrationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeCancelCalibrationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message, _snapshot.Points);
            await BroadcastSnapshotAsync(ct);
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSessionSnapshot> CancelCalibrationAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await _eyeTrackerAdapter.CancelCalibrationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);

            if (!string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase))
            {
                return _snapshot;
            }

            var completedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _snapshot = _snapshot with
            {
                Status = "cancelled",
                UpdatedAtUnixMs = completedAtUnixMs,
                CompletedAtUnixMs = completedAtUnixMs,
                Notes = ["Calibration was cancelled before completion."]
            };

            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSettingsSnapshot> UpdateSettingsAsync(int presetPointCount, CancellationToken ct = default)
    {
        if (!SupportedPointCounts.Contains(presetPointCount))
        {
            throw new ArgumentOutOfRangeException(
                nameof(presetPointCount),
                $"Unsupported calibration preset '{presetPointCount}'. Supported values are 9, 13, and 16.");
        }

        await _gate.WaitAsync(ct);
        try
        {
            if (string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Calibration settings cannot be changed while calibration is running.");
            }

            _calibrationOptions.PresetPointCount = presetPointCount;
            await SavePersistedSettingsAsync(_calibrationOptions, ct);

            if (string.Equals(_snapshot.Status, "idle", StringComparison.OrdinalIgnoreCase))
            {
                _snapshot = BuildIdleSnapshot();
                await BroadcastSnapshotAsync(ct);
            }

            return BuildSettingsSnapshot();
        }
        finally
        {
            _gate.Release();
        }
    }

    private CalibrationSessionSnapshot CreateFailedSnapshot(
        string message,
        IReadOnlyList<CalibrationPointState>? points = null)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return new CalibrationSessionSnapshot(
            Guid.NewGuid(),
            "failed",
            _calibrationOptions.GetPatternName(),
            now,
            now,
            now,
            points ?? [],
            null,
            [message]);
    }

    private void EnsureRunningSession()
    {
        if (!string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("No active calibration session. Start calibration first.");
        }
    }

    private int FindPointIndex(string pointId)
    {
        var index = _snapshot.Points
            .ToList()
            .FindIndex(point => point.PointId.Equals(pointId, StringComparison.OrdinalIgnoreCase));

        if (index < 0)
        {
            throw new ArgumentException($"Unknown calibration point '{pointId}'.", nameof(pointId));
        }

        return index;
    }

    private CalibrationPointState[] ReplacePoint(int pointIndex, CalibrationPointState point)
    {
        var nextPoints = _snapshot.Points.ToArray();
        nextPoints[pointIndex] = point;
        return nextPoints;
    }

    private CalibrationSessionSnapshot BuildIdleSnapshot()
    {
        return CalibrationSessionSnapshots.CreateIdle(_calibrationOptions.GetPatternName());
    }

    private CalibrationSettingsSnapshot BuildSettingsSnapshot()
    {
        return new CalibrationSettingsSnapshot(
            _calibrationOptions.PresetPointCount,
            _calibrationOptions.GetPatternName(),
            SupportedPointCounts,
            _calibrationOptions.GetPointDefinitions(),
            string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase));
    }

    private static string GetSettingsFilePath()
    {
        return Path.Combine(AppContext.BaseDirectory, "data", "calibration-settings.json");
    }

    private static void TryLoadPersistedSettings(CalibrationOptions calibrationOptions)
    {
        var settingsFilePath = GetSettingsFilePath();
        if (!File.Exists(settingsFilePath))
        {
            return;
        }

        try
        {
            var json = File.ReadAllText(settingsFilePath);
            var persisted = JsonSerializer.Deserialize<PersistedCalibrationSettings>(json, SettingsJsonOptions);
            if (persisted is null || !SupportedPointCounts.Contains(persisted.PresetPointCount))
            {
                return;
            }

            calibrationOptions.PresetPointCount = persisted.PresetPointCount;
        }
        catch
        {
            // Keep appsettings-backed defaults if the persisted file is missing or invalid.
        }
    }

    private static async Task SavePersistedSettingsAsync(CalibrationOptions calibrationOptions, CancellationToken ct)
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
                new PersistedCalibrationSettings { PresetPointCount = calibrationOptions.PresetPointCount },
                SettingsJsonOptions,
                ct);
        }

        File.Move(tempPath, settingsFilePath, overwrite: true);
    }

    private IReadOnlyList<string> BuildCompletionNotes(CalibrationComputeResult result)
    {
        if (!result.Applied)
        {
            return ["The eye tracker rejected the collected data. Restart calibration and try again."];
        }

        if (result.CalibrationPointCount == _snapshot.Points.Count)
        {
            return ["The eye tracker calibration was computed and applied successfully."];
        }

        var unmatchedRequestedPoints = FindUnmatchedRequestedPoints(
            _snapshot.Points,
            result.AcceptedPoints);

        if (unmatchedRequestedPoints.Count == 0)
        {
            return [$"The eye tracker applied calibration using {result.CalibrationPointCount} of {_snapshot.Points.Count} collected points."];
        }

        var labels = string.Join(", ", unmatchedRequestedPoints.Select(point => point.Label.ToLowerInvariant()));
        return
        [
            $"The eye tracker applied calibration using {result.CalibrationPointCount} of {_snapshot.Points.Count} collected points.",
            $"The retained calibration model did not include: {labels}."
        ];
    }

    private static IReadOnlyList<CalibrationPointState> FindUnmatchedRequestedPoints(
        IReadOnlyList<CalibrationPointState> requestedPoints,
        IReadOnlyList<CalibrationPointDefinition> acceptedPoints)
    {
        if (acceptedPoints.Count == 0)
        {
            return requestedPoints.ToArray();
        }

        var unmatchedRequestedPoints = new List<CalibrationPointState>();
        var usedAcceptedPoints = new bool[acceptedPoints.Count];

        foreach (var requestedPoint in requestedPoints)
        {
            var matchIndex = FindNearestAcceptedPointIndex(requestedPoint, acceptedPoints, usedAcceptedPoints);
            if (matchIndex < 0)
            {
                unmatchedRequestedPoints.Add(requestedPoint);
                continue;
            }

            usedAcceptedPoints[matchIndex] = true;
        }

        return unmatchedRequestedPoints;
    }

    private static int FindNearestAcceptedPointIndex(
        CalibrationPointState requestedPoint,
        IReadOnlyList<CalibrationPointDefinition> acceptedPoints,
        IReadOnlyList<bool> usedAcceptedPoints)
    {
        var bestIndex = -1;
        var bestDistance = double.PositiveInfinity;

        for (var index = 0; index < acceptedPoints.Count; index++)
        {
            if (usedAcceptedPoints[index])
            {
                continue;
            }

            var acceptedPoint = acceptedPoints[index];
            var dx = requestedPoint.X - acceptedPoint.X;
            var dy = requestedPoint.Y - acceptedPoint.Y;
            var distance = Math.Sqrt(dx * dx + dy * dy);

            if (distance > AcceptedPointMatchTolerance || distance >= bestDistance)
            {
                continue;
            }

            bestDistance = distance;
            bestIndex = index;
        }

        return bestIndex;
    }

    private async Task BroadcastSnapshotAsync(CancellationToken ct)
    {
        await _experimentSessionManager.SetCalibrationStateAsync(_snapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.CalibrationStateChanged, _snapshot, ct);
    }

    private async Task SafeCancelCalibrationAsync(CancellationToken ct)
    {
        try
        {
            await _eyeTrackerAdapter.CancelCalibrationAsync(ct);
        }
        catch
        {
            // Best effort cleanup for calibration mode.
        }
    }

    private async Task SafeResumeGazeStreamingAsync(CancellationToken ct)
    {
        try
        {
            await _experimentSessionManager.ResumeGazeStreamingAsync(ct);
        }
        catch
        {
            // Best effort cleanup for gaze streaming state.
        }
    }

    private sealed class PersistedCalibrationSettings
    {
        public int PresetPointCount { get; set; }
    }
}
