using System.Text.Json;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class CalibrationService : ICalibrationService
{
    private const float AcceptedPointMatchTolerance = 0.04f;
    private static readonly int[] SupportedPointCounts = [9, 13, 16];
    private static readonly CalibrationPointDefinition[] ValidationPoints =
    [
        new("validation-upper-left", "Upper left", 0.28f, 0.24f),
        new("validation-upper-right", "Upper right", 0.72f, 0.24f),
        new("validation-center", "Center", 0.50f, 0.50f),
        new("validation-lower-left", "Lower left", 0.28f, 0.76f),
        new("validation-lower-right", "Lower right", 0.72f, 0.76f)
    ];
    private static readonly JsonSerializerOptions SettingsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly ISensingOperations _sensingOperations;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly CalibrationOptions _calibrationOptions;
    private readonly SemaphoreSlim _gate = new(1, 1);

    private CalibrationSessionSnapshot _snapshot;

    public CalibrationService(
        ISensingOperations sensingOperations,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentRuntimeAuthority runtimeAuthority,
        CalibrationOptions calibrationOptions)
    {
        _sensingOperations = sensingOperations;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _runtimeAuthority = runtimeAuthority;
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
                await _sensingOperations.CancelCalibrationAsync(ct);
            }

            await _runtimeAuthority.PauseGazeStreamingAsync(ct);
            await _sensingOperations.BeginCalibrationAsync(ct);

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
                CalibrationSessionSnapshots.CreateIdleValidation(),
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

            var result = await _sensingOperations.CollectCalibrationDataAsync(point.X, point.Y, ct);
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
                await _sensingOperations.CancelCalibrationAsync(ct);
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

            var result = await _sensingOperations.ComputeAndApplyCalibrationAsync(ct);
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
                    null,
                    result.Notes),
                Validation = CalibrationSessionSnapshots.CreateIdleValidation(),
                Notes = completionNotes
            };

            await _sensingOperations.CancelCalibrationAsync(ct);
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

    public async Task<CalibrationSessionSnapshot> StartValidationAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            if (_snapshot.Result?.Applied != true)
            {
                throw new InvalidOperationException("Apply calibration on the eye tracker before starting validation.");
            }

            if (string.Equals(_snapshot.Validation.Status, "running", StringComparison.OrdinalIgnoreCase))
            {
                await _sensingOperations.CancelValidationAsync(ct);
            }

            await _runtimeAuthority.PauseGazeStreamingAsync(ct);
            await _sensingOperations.BeginValidationAsync(ct);

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _snapshot = _snapshot with
            {
                Validation = new CalibrationValidationSnapshot(
                    "running",
                    now,
                    now,
                    null,
                    ValidationPoints
                        .Select(point => new CalibrationValidationPointState(
                            point.PointId,
                            point.Label,
                            point.X,
                            point.Y,
                            "pending",
                            0,
                            null,
                            []))
                        .ToArray(),
                    null,
                    ["Validation mode started. Hold steady while the validation targets are shown."]),
                Result = _snapshot.Result with { Validation = null },
                Notes = ["Calibration applied. Validation is now collecting quality metrics."]
            };

            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeCancelValidationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message, _snapshot.Points, _snapshot.Validation);
            await BroadcastSnapshotAsync(ct);
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSessionSnapshot> CollectValidationPointAsync(string pointId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(pointId))
        {
            throw new ArgumentException("pointId is required.", nameof(pointId));
        }

        await _gate.WaitAsync(ct);
        try
        {
            EnsureValidationRunningSession();

            var pointIndex = FindValidationPointIndex(pointId);
            var point = _snapshot.Validation.Points[pointIndex];

            _snapshot = _snapshot with
            {
                Validation = _snapshot.Validation with
                {
                    UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    Points = ReplaceValidationPoint(pointIndex, point with
                    {
                        Status = "collecting",
                        Notes = ["Collecting gaze samples for validation."]
                    }),
                    Notes = [$"Collecting validation data for {point.Label.ToLowerInvariant()}."]
                }
            };
            await BroadcastSnapshotAsync(ct);

            var result = await _sensingOperations.CollectValidationDataAsync(point.X, point.Y, ct);
            var collectedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nextPoint = point with
            {
                Status = result.Succeeded ? "collected" : "failed",
                SampleCount = result.SampleCount,
                CollectedAtUnixMs = collectedAtUnixMs,
                Notes = result.Notes
            };

            _snapshot = _snapshot with
            {
                Validation = _snapshot.Validation with
                {
                    Status = result.Succeeded ? "running" : "failed",
                    UpdatedAtUnixMs = collectedAtUnixMs,
                    CompletedAtUnixMs = result.Succeeded ? null : collectedAtUnixMs,
                    Points = ReplaceValidationPoint(pointIndex, nextPoint),
                    Notes = result.Succeeded
                        ? [$"Collected validation data for {point.Label.ToLowerInvariant()}."]
                        : [$"Validation failed for {point.Label.ToLowerInvariant()}. Restart validation and try again."]
                }
            };

            if (!result.Succeeded)
            {
                await _sensingOperations.CancelValidationAsync(ct);
                await SafeResumeGazeStreamingAsync(ct);
            }

            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeCancelValidationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message, _snapshot.Points, _snapshot.Validation with
            {
                Status = "failed",
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                CompletedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Notes = [ex.Message]
            });
            await BroadcastSnapshotAsync(ct);
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CalibrationSessionSnapshot> FinishValidationAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            EnsureValidationRunningSession();

            if (_snapshot.Validation.Points.Any(point => !string.Equals(point.Status, "collected", StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("All validation points must be collected before validation can be computed.");
            }

            var result = NormalizeValidationResult(await _sensingOperations.ComputeValidationAsync(ct));
            var completedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var validationStatus = "completed";
            var validationNotes = BuildValidationCompletionNotes(result);

            _snapshot = _snapshot with
            {
                Validation = _snapshot.Validation with
                {
                    Status = validationStatus,
                    UpdatedAtUnixMs = completedAtUnixMs,
                    CompletedAtUnixMs = completedAtUnixMs,
                    Result = result,
                    Notes = validationNotes
                },
                Result = _snapshot.Result! with
                {
                    Validation = result
                },
                Notes = result.Passed
                    ? ["Calibration and validation completed. The setup is ready for session start."]
                    : ["Validation completed, but the quality metrics were below the required threshold."]
            };

            await _sensingOperations.CancelValidationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            await BroadcastSnapshotAsync(ct);
            return _snapshot;
        }
        catch (Exception ex)
        {
            await SafeCancelValidationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);
            _snapshot = CreateFailedSnapshot(ex.Message, _snapshot.Points, _snapshot.Validation with
            {
                Status = "failed",
                UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                CompletedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Notes = [ex.Message]
            });
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
            await _sensingOperations.CancelCalibrationAsync(ct);
            await _sensingOperations.CancelValidationAsync(ct);
            await SafeResumeGazeStreamingAsync(ct);

            var calibrationRunning = string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase);
            var validationRunning = string.Equals(_snapshot.Validation.Status, "running", StringComparison.OrdinalIgnoreCase);

            if (!calibrationRunning && !validationRunning)
            {
                return _snapshot;
            }

            var completedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _snapshot = _snapshot with
            {
                Status = calibrationRunning ? "cancelled" : _snapshot.Status,
                UpdatedAtUnixMs = completedAtUnixMs,
                CompletedAtUnixMs = calibrationRunning ? completedAtUnixMs : _snapshot.CompletedAtUnixMs,
                Validation = validationRunning
                    ? _snapshot.Validation with
                    {
                        Status = "cancelled",
                        UpdatedAtUnixMs = completedAtUnixMs,
                        CompletedAtUnixMs = completedAtUnixMs,
                        Notes = ["Validation was cancelled before completion."]
                    }
                    : _snapshot.Validation,
                Notes = calibrationRunning
                    ? ["Calibration was cancelled before completion."]
                    : ["Validation was cancelled before completion."]
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
        IReadOnlyList<CalibrationPointState>? points = null,
        CalibrationValidationSnapshot? validation = null)
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
            validation ?? CalibrationSessionSnapshots.CreateIdleValidation(),
            [message]);
    }

    private void EnsureRunningSession()
    {
        if (!string.Equals(_snapshot.Status, "running", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("No active calibration session. Start calibration first.");
        }
    }

    private void EnsureValidationRunningSession()
    {
        if (!string.Equals(_snapshot.Validation.Status, "running", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("No active validation session. Start validation first.");
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

    private int FindValidationPointIndex(string pointId)
    {
        var index = _snapshot.Validation.Points
            .ToList()
            .FindIndex(point => point.PointId.Equals(pointId, StringComparison.OrdinalIgnoreCase));

        if (index < 0)
        {
            throw new ArgumentException($"Unknown validation point '{pointId}'.", nameof(pointId));
        }

        return index;
    }

    private CalibrationPointState[] ReplacePoint(int pointIndex, CalibrationPointState point)
    {
        var nextPoints = _snapshot.Points.ToArray();
        nextPoints[pointIndex] = point;
        return nextPoints;
    }

    private CalibrationValidationPointState[] ReplaceValidationPoint(int pointIndex, CalibrationValidationPointState point)
    {
        var nextPoints = _snapshot.Validation.Points.ToArray();
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
            return ["The eye tracker calibration was computed and applied successfully. Continue to validation to review quality metrics."];
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
            $"The retained calibration model did not include: {labels}.",
            "Continue to validation to review the resulting quality metrics."
        ];
    }

    private static IReadOnlyList<string> BuildValidationCompletionNotes(CalibrationValidationResult result)
    {
        if (result.Passed)
        {
            return
            [
                $"Validation passed with {result.Quality} quality.",
                $"Average accuracy: {FormatDegrees(result.AverageAccuracyDegrees)}. Average precision: {FormatDegrees(result.AveragePrecisionDegrees)}."
            ];
        }

        return
        [
            $"Validation completed with {result.Quality} quality.",
            $"Average accuracy: {FormatDegrees(result.AverageAccuracyDegrees)}. Average precision: {FormatDegrees(result.AveragePrecisionDegrees)}.",
            "Re-run calibration or validation before starting the session."
        ];
    }

    private static string FormatDegrees(double? value)
    {
        return value.HasValue ? $"{value.Value:0.00}°" : "-";
    }

    private CalibrationValidationResult NormalizeValidationResult(CalibrationValidationResult result)
    {
        if (result.Points.Count == 0 || _snapshot.Validation.Points.Count == 0)
        {
            return result;
        }

        var normalizedPoints = result.Points
            .Select(point =>
            {
                var match = _snapshot.Validation.Points.FirstOrDefault(candidate =>
                    Math.Abs(candidate.X - point.X) <= AcceptedPointMatchTolerance &&
                    Math.Abs(candidate.Y - point.Y) <= AcceptedPointMatchTolerance);

                return match is null
                    ? point
                    : point with
                    {
                        PointId = match.PointId,
                        Label = match.Label
                    };
            })
            .ToArray();

        return result with { Points = normalizedPoints };
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
        await _runtimeAuthority.SetCalibrationStateAsync(_snapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.CalibrationStateChanged, _snapshot, ct);
    }

    private async Task SafeCancelCalibrationAsync(CancellationToken ct)
    {
        try
        {
            await _sensingOperations.CancelCalibrationAsync(ct);
        }
        catch
        {
            // Best effort cleanup for calibration mode.
        }
    }

    private async Task SafeCancelValidationAsync(CancellationToken ct)
    {
        try
        {
            await _sensingOperations.CancelValidationAsync(ct);
        }
        catch
        {
            // Best effort cleanup for validation mode.
        }
    }

    private async Task SafeResumeGazeStreamingAsync(CancellationToken ct)
    {
        try
        {
            await _runtimeAuthority.ResumeGazeStreamingAsync(ct);
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
