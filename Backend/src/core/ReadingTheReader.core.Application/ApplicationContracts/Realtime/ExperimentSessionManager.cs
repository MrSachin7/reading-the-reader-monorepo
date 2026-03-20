using System.Collections.Concurrent;
using System.Text.Json;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class ExperimentSessionManager : IExperimentSessionManager
{
    private const int MaxRecentInterventions = 25;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentStateStoreAdapter _experimentStateStoreAdapter;
    private readonly IExperimentReplayExportStoreAdapter _experimentReplayExportStoreAdapter;
    private readonly IReadingInterventionRuntime _readingInterventionRuntime;
    private readonly SemaphoreSlim _lifecycleGate = new(1, 1);
    private readonly ConcurrentDictionary<string, byte> _gazeSubscribers = new();
    private readonly ConcurrentDictionary<string, byte> _participantViewConnections = new();
    private readonly object _historyGate = new();

    private int _isSubscribedToHardware;
    private int _isHardwareTracking;
    private int _isGazeStreamingSuppressed;
    private long _receivedGazeSamples;
    private long _eventSequenceNumber;
    private GazeData? _latestGazeSample;
    private CalibrationSessionSnapshot _calibrationSnapshot = CalibrationSessionSnapshots.CreateIdle();
    private ExperimentSession _session = ExperimentSession.Inactive;
    private LiveReadingSessionSnapshot _liveReadingSession = LiveReadingSessionSnapshot.Empty;
    private ExperimentSessionSnapshot? _initialSnapshot;
    private List<ExperimentLifecycleEventRecord> _lifecycleEvents = [];
    private List<GazeSampleRecord> _gazeSamples = [];
    private List<ReadingSessionStateRecord> _readingSessionStates = [];
    private List<ParticipantViewportEventRecord> _participantViewportEvents = [];
    private List<ReadingFocusEventRecord> _readingFocusEvents = [];
    private List<InterventionEventRecord> _interventionEvents = [];

    public ExperimentSessionManager(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentStateStoreAdapter experimentStateStoreAdapter,
        IExperimentReplayExportStoreAdapter experimentReplayExportStoreAdapter,
        IReadingInterventionRuntime readingInterventionRuntime)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _experimentStateStoreAdapter = experimentStateStoreAdapter;
        _experimentReplayExportStoreAdapter = experimentReplayExportStoreAdapter;
        _readingInterventionRuntime = readingInterventionRuntime;

        RestoreLatestSnapshot();
    }

    public async ValueTask SetCurrentParticipantAsync(Participant participant, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            var participantCopy = participant.Copy();
            Volatile.Write(ref _session, current with { Participant = participantCopy });

            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SetCurrentEyeTrackerAsync(EyeTrackerDevice eyeTrackerDevice, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            var eyeTrackerCopy = eyeTrackerDevice.Copy();
            Volatile.Write(ref _session, current with { EyeTrackerDevice = eyeTrackerCopy });

            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SetCalibrationStateAsync(CalibrationSessionSnapshot calibrationSnapshot, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _calibrationSnapshot = calibrationSnapshot;
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SetReadingSessionAsync(UpsertReadingSessionCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.DocumentId))
        {
            throw new InvalidOperationException("documentId is required.");
        }

        if (string.IsNullOrWhiteSpace(command.Title))
        {
            throw new InvalidOperationException("title is required.");
        }

        if (string.IsNullOrWhiteSpace(command.Markdown))
        {
            throw new InvalidOperationException("markdown is required.");
        }

        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var content = new ReadingContentSnapshot(
                command.DocumentId.Trim(),
                command.Title.Trim(),
                command.Markdown,
                string.IsNullOrWhiteSpace(command.SourceSetupId) ? null : command.SourceSetupId.Trim(),
                updatedAtUnixMs);

            var viewportIsConnected = _liveReadingSession.ParticipantViewport.IsConnected;
            _liveReadingSession = _liveReadingSession with
            {
                Content = content,
                Presentation = ReadingPresentationRules.Normalize(command.Presentation),
                Appearance = ReaderAppearanceRules.Normalize(command.Appearance),
                ParticipantViewport = ParticipantViewportSnapshot.Disconnected with
                {
                    IsConnected = viewportIsConnected,
                    UpdatedAtUnixMs = updatedAtUnixMs
                },
                Focus = ReadingFocusSnapshot.Empty,
            };

            nextState = _liveReadingSession.Copy();
            RecordReadingSessionState("reading-session-configured", updatedAtUnixMs, nextState);
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
    }

    public async ValueTask<LiveReadingSessionSnapshot> RegisterParticipantViewAsync(string connectionId, CancellationToken ct = default)
    {
        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _participantViewConnections[connectionId] = 0;
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _liveReadingSession = _liveReadingSession with
            {
                ParticipantViewport = _liveReadingSession.ParticipantViewport with
                {
                    IsConnected = true,
                    UpdatedAtUnixMs = updatedAtUnixMs
                }
            };

            nextState = _liveReadingSession.Copy();
            RecordParticipantViewportEvent(updatedAtUnixMs, nextState.ParticipantViewport);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, nextState.ParticipantViewport, ct);
        return nextState;
    }

    public async ValueTask<ParticipantViewportSnapshot> UpdateParticipantViewportAsync(
        string connectionId,
        UpdateParticipantViewportCommand command,
        CancellationToken ct = default)
    {
        ParticipantViewportSnapshot viewport;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _participantViewConnections[connectionId] = 0;
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _liveReadingSession = _liveReadingSession with
            {
                ParticipantViewport = new ParticipantViewportSnapshot(
                    true,
                    Clamp(command.ScrollProgress, 0, 1),
                    Math.Max(command.ScrollTopPx, 0),
                    Math.Max(command.ViewportWidthPx, 0),
                    Math.Max(command.ViewportHeightPx, 0),
                    Math.Max(command.ContentHeightPx, 0),
                    Math.Max(command.ContentWidthPx, 0),
                    updatedAtUnixMs)
            };

            viewport = _liveReadingSession.ParticipantViewport.Copy();
            RecordParticipantViewportEvent(updatedAtUnixMs, viewport);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, viewport, ct);
        return viewport;
    }

    public async ValueTask<ReadingFocusSnapshot> UpdateReadingFocusAsync(
        UpdateReadingFocusCommand command,
        CancellationToken ct = default)
    {
        ReadingFocusSnapshot focus;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _liveReadingSession = _liveReadingSession with
            {
                Focus = new ReadingFocusSnapshot(
                    command.IsInsideReadingArea,
                    command.IsInsideReadingArea ? ClampNullable(command.NormalizedContentX, 0, 1) : null,
                    command.IsInsideReadingArea ? ClampNullable(command.NormalizedContentY, 0, 1) : null,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveTokenId) : null,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveBlockId) : null,
                    updatedAtUnixMs)
            };

            focus = _liveReadingSession.Focus.Copy();
            RecordReadingFocusEvent(updatedAtUnixMs, focus);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingFocusChanged, focus, ct);
        return focus;
    }

    public async ValueTask<InterventionEventSnapshot?> ApplyInterventionAsync(
        ApplyInterventionCommand command,
        CancellationToken ct = default)
    {
        InterventionEventSnapshot? interventionEvent;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var execution = _readingInterventionRuntime.Apply(
                _liveReadingSession.Presentation,
                _liveReadingSession.Appearance,
                command,
                updatedAtUnixMs);

            if (execution is null)
            {
                return null;
            }

            _liveReadingSession = _liveReadingSession with
            {
                Presentation = execution.Presentation.Copy(),
                Appearance = execution.Appearance.Copy(),
                LatestIntervention = execution.Event.Copy(),
                RecentInterventions = BuildRecentInterventionHistory(
                    _liveReadingSession.RecentInterventions,
                    execution.Event)
            };

            interventionEvent = execution.Event.Copy();
            nextState = _liveReadingSession.Copy();
            RecordInterventionEvent(updatedAtUnixMs, interventionEvent);
            RecordReadingSessionState("intervention-applied", updatedAtUnixMs, nextState);
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (interventionEvent is not null && nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
        }

        return interventionEvent;
    }

    public async ValueTask PauseGazeStreamingAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 1);
            StopHardwareStreaming();
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask ResumeGazeStreamingAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 0);
            await EnsureGazeStreamingStateAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async Task<bool> StartSessionAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (current.IsActive)
            {
                return false;
            }

            EnsureSetupIsReadyForStart(current, _calibrationSnapshot, _liveReadingSession);

            Interlocked.Exchange(ref _receivedGazeSamples, 0);
            Interlocked.Exchange(ref _eventSequenceNumber, 0);
            Volatile.Write(ref _latestGazeSample, null);

            var startedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            Volatile.Write(ref _session, ExperimentSession.StartNew(startedAt, current.Participant, current.EyeTrackerDevice));
            ResetReplayHistory();
            RecordLifecycleEvent("session-started", "system", startedAt);
            RecordReadingSessionState("session-started", startedAt, _liveReadingSession.Copy());
            await EnsureGazeStreamingStateAsync(ct);

            var snapshot = GetCurrentSnapshot();
            SetInitialSnapshot(snapshot);
            await _experimentStateStoreAdapter.SaveSnapshotAsync(snapshot, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentStarted, snapshot, ct);
            return true;
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async Task<bool> StopSessionAsync(CancellationToken ct = default)
    {
        var snapshot = await StopSessionCoreAsync("system", ct);
        return snapshot is not null;
    }

    public async Task<ExperimentSessionSnapshot> FinishSessionAsync(FinishExperimentCommand command, CancellationToken ct = default)
    {
        var source = string.IsNullOrWhiteSpace(command.Source) ? "unknown" : command.Source.Trim();
        return await StopSessionCoreAsync(source, ct) ?? GetCurrentSnapshot();
    }

    public ValueTask<ExperimentReplayExport?> GetLatestReplayExportAsync(CancellationToken ct = default)
    {
        return _experimentReplayExportStoreAdapter.LoadLatestAsync(ct);
    }

    public async ValueTask<SavedExperimentReplayExportSummary> SaveLatestReplayExportAsync(
        SaveExperimentReplayExportCommand command,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            throw new InvalidOperationException("A name is required.");
        }

        var latest = await _experimentReplayExportStoreAdapter.LoadLatestAsync(ct);
        if (latest is null)
        {
            throw new InvalidOperationException("No completed experiment export is available yet.");
        }

        var format = ExperimentReplayExportFormats.Normalize(command.Format);

        var savedExport = latest with
        {
            Metadata = latest.Metadata with
            {
                SavedName = command.Name.Trim()
            }
        };

        return await _experimentReplayExportStoreAdapter.SaveNamedAsync(command.Name.Trim(), format, savedExport, ct);
    }

    public ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedReplayExportsAsync(CancellationToken ct = default)
    {
        return _experimentReplayExportStoreAdapter.ListSavedAsync(ct);
    }

    public ValueTask<ExperimentReplayExport?> GetSavedReplayExportByIdAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return ValueTask.FromResult<ExperimentReplayExport?>(null);
        }

        return _experimentReplayExportStoreAdapter.LoadSavedByIdAsync(id.Trim(), ct);
    }

    private async Task<ExperimentSessionSnapshot?> StopSessionCoreAsync(string source, CancellationToken ct)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (!current.IsActive)
            {
                return null;
            }

            var stoppedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            Volatile.Write(ref _session, current.Stop(stoppedAtUnixMs));
            RecordLifecycleEvent("session-stopped", source, stoppedAtUnixMs);
            await EnsureGazeStreamingStateAsync(ct);

            var snapshot = GetCurrentSnapshot();
            await _experimentStateStoreAdapter.SaveSnapshotAsync(snapshot, ct);
            var exportDocument = BuildReplayExport(snapshot, source, stoppedAtUnixMs);
            await _experimentReplayExportStoreAdapter.SaveLatestAsync(exportDocument, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentStopped, snapshot, ct);
            return snapshot;
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public void UpdateGazeSample(GazeData gazeData)
    {
        gazeData.Sanitize();
        var capturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Interlocked.Increment(ref _receivedGazeSamples);
        Volatile.Write(ref _latestGazeSample, gazeData);
        RecordGazeSample(capturedAtUnixMs, gazeData);
    }

    public ExperimentSessionSnapshot GetCurrentSnapshot()
    {
        var session = Volatile.Read(ref _session);
        var latest = Volatile.Read(ref _latestGazeSample);

        return new ExperimentSessionSnapshot(
            session.Id,
            session.IsActive,
            session.StartedAtUnixMs,
            session.StoppedAtUnixMs,
            session.Participant?.Copy(),
            session.EyeTrackerDevice?.Copy(),
            _calibrationSnapshot,
            BuildSetupSnapshot(session, _calibrationSnapshot, _liveReadingSession),
            Interlocked.Read(ref _receivedGazeSamples),
            latest?.Copy(),
            _clientBroadcasterAdapter.ConnectedClients,
            _liveReadingSession.Copy());
    }

    public async Task HandleInboundMessageAsync(string connectionId, string messageType, JsonElement payload, CancellationToken ct = default)
    {
        switch (messageType)
        {
            case MessageTypes.Ping:
                await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Pong, new
                {
                    serverTimeUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                }, ct);
                break;

            case MessageTypes.StartExperiment:
                await StartSessionAsync(ct);
                break;

            case MessageTypes.StopExperiment:
                await StopSessionAsync(ct);
                break;

            case MessageTypes.SubscribeGazeData:
                await SubscribeGazeDataAsync(connectionId, ct);
                break;

            case MessageTypes.UnsubscribeGazeData:
                await UnsubscribeGazeDataAsync(connectionId, ct);
                break;

            case MessageTypes.GetExperimentState:
                await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.ExperimentState, GetCurrentSnapshot(), ct);
                break;

            case MessageTypes.RegisterParticipantView:
                await RegisterParticipantViewAsync(connectionId, ct);
                break;

            case MessageTypes.UnregisterParticipantView:
                await UnregisterParticipantViewAsync(connectionId, ct);
                break;

            case MessageTypes.ParticipantViewportUpdated:
                if (TryDeserializePayload<UpdateParticipantViewportCommand>(payload, out var viewportCommand))
                {
                    await UpdateParticipantViewportAsync(connectionId, viewportCommand!, ct);
                    return;
                }

                await SendErrorAsync(connectionId, "Participant viewport payload is invalid.", ct);
                break;

            case MessageTypes.ReadingFocusUpdated:
                if (TryDeserializePayload<UpdateReadingFocusCommand>(payload, out var focusCommand))
                {
                    await UpdateReadingFocusAsync(focusCommand!, ct);
                    return;
                }

                await SendErrorAsync(connectionId, "Reading focus payload is invalid.", ct);
                break;

            case MessageTypes.ApplyIntervention:
                if (TryDeserializePayload<ApplyInterventionCommand>(payload, out var interventionCommand))
                {
                    await ApplyInterventionAsync(interventionCommand!, ct);
                    return;
                }

                await SendErrorAsync(connectionId, "Intervention payload is invalid.", ct);
                break;
            case MessageTypes.ResearcherCommand:
                if (payload.ValueKind == JsonValueKind.Object &&
                    payload.TryGetProperty("command", out var command) &&
                    command.ValueKind == JsonValueKind.String)
                {
                    var commandValue = command.GetString();
                    if (string.Equals(commandValue, MessageTypes.StartExperiment, StringComparison.OrdinalIgnoreCase))
                    {
                        await StartSessionAsync(ct);
                        return;
                    }

                    if (string.Equals(commandValue, MessageTypes.StopExperiment, StringComparison.OrdinalIgnoreCase))
                    {
                        await StopSessionAsync(ct);
                        return;
                    }
                }

                await SendErrorAsync(connectionId, "Unsupported researcher command", ct);
                break;

            default:
                await SendErrorAsync(connectionId, $"Unsupported message type '{messageType}'", ct);
                break;
        }
    }

    public async Task HandleClientDisconnectedAsync(string connectionId, CancellationToken ct = default)
    {
        await UnsubscribeGazeDataAsync(connectionId, ct);
        await UnregisterParticipantViewAsync(connectionId, ct);
    }

    private void OnGazeDataReceived(object? sender, GazeData gazeData)
    {
        if (_gazeSubscribers.IsEmpty)
        {
            return;
        }

        UpdateGazeSample(gazeData);
        var subscribers = _gazeSubscribers.Keys.ToArray();
        var sendTask = BroadcastGazeSampleAsync(subscribers, gazeData);
        if (!sendTask.IsCompletedSuccessfully)
        {
            _ = IgnoreFailuresAsync(sendTask.AsTask());
        }
    }

    private async Task SubscribeGazeDataAsync(string connectionId, CancellationToken ct)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _gazeSubscribers[connectionId] = 0;

            try
            {
                await EnsureGazeStreamingStateAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"SubscribeGazeData failed. ConnectionId={connectionId}, Reason=EyeTrackerNotReady, Error={ex.Message}");
                await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
                {
                    message = $"Cannot stream gaze data because the eye tracker is not ready or the licence has not been applied: {ex.Message}"
                }, ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    private async Task UnsubscribeGazeDataAsync(string connectionId, CancellationToken ct)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _gazeSubscribers.TryRemove(connectionId, out _);
            await EnsureGazeStreamingStateAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    private async Task UnregisterParticipantViewAsync(string connectionId, CancellationToken ct)
    {
        ParticipantViewportSnapshot? viewport = null;
        ReadingFocusSnapshot? focus = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (!_participantViewConnections.TryRemove(connectionId, out _))
            {
                return;
            }

            if (_participantViewConnections.IsEmpty)
            {
                var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                _liveReadingSession = _liveReadingSession with
                {
                    ParticipantViewport = ParticipantViewportSnapshot.Disconnected with
                    {
                        UpdatedAtUnixMs = updatedAtUnixMs
                    },
                    Focus = ReadingFocusSnapshot.Empty with
                    {
                        UpdatedAtUnixMs = updatedAtUnixMs
                    }
                };

                viewport = _liveReadingSession.ParticipantViewport.Copy();
                focus = _liveReadingSession.Focus.Copy();
                RecordParticipantViewportEvent(updatedAtUnixMs, viewport);
                RecordReadingFocusEvent(updatedAtUnixMs, focus);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (viewport is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, viewport, ct);
        }

        if (focus is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingFocusChanged, focus, ct);
        }
    }

    private async Task EnsureGazeStreamingStateAsync(CancellationToken ct)
    {
        var session = Volatile.Read(ref _session);
        var shouldStream = !_gazeSubscribers.IsEmpty && Volatile.Read(ref _isGazeStreamingSuppressed) == 0;

        if (shouldStream)
        {
            if (Interlocked.Exchange(ref _isSubscribedToHardware, 1) == 0)
            {
                _eyeTrackerAdapter.GazeDataReceived += OnGazeDataReceived;
            }

            if (Interlocked.Exchange(ref _isHardwareTracking, 1) == 0)
            {
                try
                {
                    await _eyeTrackerAdapter.StartEyeTracking();
                    Console.WriteLine(
                        $"Gaze streaming started. SessionId={session.Id}, Subscribers={_gazeSubscribers.Count}");
                }
                catch
                {
                    Interlocked.Exchange(ref _isHardwareTracking, 0);
                    if (Interlocked.Exchange(ref _isSubscribedToHardware, 0) == 1)
                    {
                        _eyeTrackerAdapter.GazeDataReceived -= OnGazeDataReceived;
                    }

                    throw;
                }
            }

            return;
        }

        StopHardwareStreaming();
        Console.WriteLine(
            $"Gaze streaming stopped. SessionId={session.Id}, Subscribers={_gazeSubscribers.Count}, SessionActive={session.IsActive}, Suppressed={Volatile.Read(ref _isGazeStreamingSuppressed) == 1}");
    }

    private async ValueTask BroadcastGazeSampleAsync(string[] subscribers, GazeData gazeData)
    {
        foreach (var connectionId in subscribers)
        {
            await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.GazeSample, gazeData);
        }
    }

    private static async Task IgnoreFailuresAsync(Task task)
    {
        try
        {
            await task;
        }
        catch
        {
            // Keep gaze ingestion non-blocking.
        }
    }

    private async Task SaveCurrentSnapshotAsync(CancellationToken ct)
    {
        await _experimentStateStoreAdapter.SaveSnapshotAsync(GetCurrentSnapshot(), ct);
    }

    private void RestoreLatestSnapshot()
    {
        var snapshot = _experimentStateStoreAdapter.LoadLatestSnapshotAsync().AsTask().GetAwaiter().GetResult();
        if (snapshot is null)
        {
            return;
        }

        Volatile.Write(ref _session, new ExperimentSession(
            snapshot.SessionId,
            snapshot.IsActive,
            snapshot.StartedAtUnixMs,
            snapshot.StoppedAtUnixMs,
            snapshot.Participant?.Copy(),
            snapshot.EyeTrackerDevice?.Copy()));

        _calibrationSnapshot = snapshot.Calibration ?? CalibrationSessionSnapshots.CreateIdle();
        Interlocked.Exchange(ref _receivedGazeSamples, snapshot.ReceivedGazeSamples);
        Volatile.Write(ref _latestGazeSample, snapshot.LatestGazeSample?.Copy());
        _liveReadingSession = snapshot.ReadingSession?.Copy() ?? LiveReadingSessionSnapshot.Empty;
    }

    private void ResetReplayHistory()
    {
        lock (_historyGate)
        {
            _initialSnapshot = null;
            _lifecycleEvents = [];
            _gazeSamples = [];
            _readingSessionStates = [];
            _participantViewportEvents = [];
            _readingFocusEvents = [];
            _interventionEvents = [];
        }
    }

    private void SetInitialSnapshot(ExperimentSessionSnapshot snapshot)
    {
        lock (_historyGate)
        {
            _initialSnapshot = snapshot.Copy();
        }
    }

    private void RecordLifecycleEvent(string eventType, string source, long occurredAtUnixMs)
    {
        lock (_historyGate)
        {
            _lifecycleEvents.Add(new ExperimentLifecycleEventRecord(
                NextSequenceNumber(),
                eventType,
                source,
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs)));
        }
    }

    private void RecordGazeSample(long capturedAtUnixMs, GazeData gazeData)
    {
        lock (_historyGate)
        {
            _gazeSamples.Add(new GazeSampleRecord(
                NextSequenceNumber(),
                capturedAtUnixMs,
                CalculateElapsedSinceStart(capturedAtUnixMs),
                gazeData.Copy()));
        }
    }

    private void RecordReadingSessionState(string reason, long occurredAtUnixMs, LiveReadingSessionSnapshot session)
    {
        if (session.Content is null)
        {
            return;
        }

        lock (_historyGate)
        {
            _readingSessionStates.Add(new ReadingSessionStateRecord(
                NextSequenceNumber(),
                reason,
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                session.Copy()));
        }
    }

    private void RecordParticipantViewportEvent(long occurredAtUnixMs, ParticipantViewportSnapshot viewport)
    {
        lock (_historyGate)
        {
            _participantViewportEvents.Add(new ParticipantViewportEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                viewport.Copy()));
        }
    }

    private void RecordReadingFocusEvent(long occurredAtUnixMs, ReadingFocusSnapshot focus)
    {
        lock (_historyGate)
        {
            _readingFocusEvents.Add(new ReadingFocusEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                focus.Copy()));
        }
    }

    private void RecordInterventionEvent(long occurredAtUnixMs, InterventionEventSnapshot intervention)
    {
        lock (_historyGate)
        {
            _interventionEvents.Add(new InterventionEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                intervention.Copy()));
        }
    }

    private ExperimentReplayExport BuildReplayExport(
        ExperimentSessionSnapshot finalSnapshot,
        string completionSource,
        long exportedAtUnixMs)
    {
        lock (_historyGate)
        {
            var initialSnapshot = (_initialSnapshot ?? finalSnapshot).Copy();
            var lifecycleEvents = _lifecycleEvents.Select(item => item.Copy()).ToArray();
            var gazeSamples = _gazeSamples.Select(item => item.Copy()).ToArray();
            var readingSessionStates = _readingSessionStates.Select(item => item.Copy()).ToArray();
            var participantViewportEvents = _participantViewportEvents.Select(item => item.Copy()).ToArray();
            var readingFocusEvents = _readingFocusEvents.Select(item => item.Copy()).ToArray();
            var interventionEvents = _interventionEvents.Select(item => item.Copy()).ToArray();
            long? durationMs = finalSnapshot.StartedAtUnixMs > 0 && finalSnapshot.StoppedAtUnixMs.HasValue
                ? Math.Max(0L, finalSnapshot.StoppedAtUnixMs.Value - finalSnapshot.StartedAtUnixMs)
                : null;

            return new ExperimentReplayExport(
                new ExperimentReplayMetadata(
                    "reading-the-reader.experiment-replay",
                    1,
                    exportedAtUnixMs,
                    finalSnapshot.SessionId,
                    completionSource,
                    finalSnapshot.StartedAtUnixMs,
                    finalSnapshot.StoppedAtUnixMs,
                    durationMs),
                new ExperimentReplayStatistics(
                    lifecycleEvents.Length,
                    gazeSamples.Length,
                    readingSessionStates.Length,
                    participantViewportEvents.Length,
                    readingFocusEvents.Length,
                    interventionEvents.Length),
                initialSnapshot,
                finalSnapshot.Copy(),
                lifecycleEvents,
                gazeSamples,
                readingSessionStates,
                participantViewportEvents,
                readingFocusEvents,
                interventionEvents);
        }
    }

    private long NextSequenceNumber()
    {
        return Interlocked.Increment(ref _eventSequenceNumber);
    }

    private long? CalculateElapsedSinceStart(long occurredAtUnixMs)
    {
        var startedAtUnixMs = Volatile.Read(ref _session).StartedAtUnixMs;
        if (startedAtUnixMs <= 0)
        {
            return null;
        }

        return Math.Max(0, occurredAtUnixMs - startedAtUnixMs);
    }

    private static ExperimentSetupSnapshot BuildSetupSnapshot(
        ExperimentSession session,
        CalibrationSessionSnapshot calibrationSnapshot,
        LiveReadingSessionSnapshot liveReadingSession)
    {
        var eyeTrackerSetupCompleted = session.EyeTrackerDevice is not null &&
                                       !string.IsNullOrWhiteSpace(session.EyeTrackerDevice.SerialNumber);
        var participantSetupCompleted = session.Participant is not null &&
                                        !string.IsNullOrWhiteSpace(session.Participant.Name);
        var calibrationCompleted = CalibrationSessionSnapshots.IsReadyForSession(calibrationSnapshot);
        var readingMaterialSetupCompleted = liveReadingSession.Content is not null &&
                                            !string.IsNullOrWhiteSpace(liveReadingSession.Content.Markdown);

        var currentStepIndex =
            !eyeTrackerSetupCompleted ? 0 :
            !participantSetupCompleted ? 1 :
            !calibrationCompleted ? 2 :
            3;

        return new ExperimentSetupSnapshot(
            eyeTrackerSetupCompleted,
            participantSetupCompleted,
            calibrationCompleted,
            readingMaterialSetupCompleted,
            currentStepIndex);
    }

    private static void EnsureSetupIsReadyForStart(
        ExperimentSession session,
        CalibrationSessionSnapshot calibrationSnapshot,
        LiveReadingSessionSnapshot liveReadingSession)
    {
        if (session.EyeTrackerDevice is null || string.IsNullOrWhiteSpace(session.EyeTrackerDevice.SerialNumber))
        {
            throw new InvalidOperationException("Select and license an eye tracker before starting the session.");
        }

        if (session.Participant is null || string.IsNullOrWhiteSpace(session.Participant.Name))
        {
            throw new InvalidOperationException("Save the participant information before starting the session.");
        }

        if (!CalibrationSessionSnapshots.IsReadyForSession(calibrationSnapshot))
        {
            throw new InvalidOperationException("Calibration validation must pass before the session can start.");
        }

        if (liveReadingSession.Content is null || string.IsNullOrWhiteSpace(liveReadingSession.Content.Markdown))
        {
            throw new InvalidOperationException("Choose the reading material before starting the session.");
        }
    }

    private static IReadOnlyList<InterventionEventSnapshot> BuildRecentInterventionHistory(
        IReadOnlyList<InterventionEventSnapshot>? existing,
        InterventionEventSnapshot next)
    {
        var items = existing is null
            ? new List<InterventionEventSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());

        if (items.Count > MaxRecentInterventions)
        {
            items.RemoveRange(MaxRecentInterventions, items.Count - MaxRecentInterventions);
        }

        return items;
    }

    private static bool TryDeserializePayload<T>(JsonElement payload, out T? value)
    {
        try
        {
            value = payload.Deserialize<T>(JsonOptions);
            return value is not null;
        }
        catch
        {
            value = default;
            return false;
        }
    }

    private async Task SendErrorAsync(string connectionId, string message, CancellationToken ct)
    {
        await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
        {
            message
        }, ct);
    }

    private static double Clamp(double value, double min, double max)
    {
        return Math.Min(max, Math.Max(min, value));
    }

    private static double? ClampNullable(double? value, double min, double max)
    {
        return value.HasValue ? Clamp(value.Value, min, max) : null;
    }

    private static string? NormalizeNullableText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private void StopHardwareStreaming()
    {
        if (Interlocked.Exchange(ref _isHardwareTracking, 0) == 1)
        {
            _eyeTrackerAdapter.StopEyeTracking();
        }

        if (Interlocked.Exchange(ref _isSubscribedToHardware, 0) == 1)
        {
            _eyeTrackerAdapter.GazeDataReceived -= OnGazeDataReceived;
        }
    }
}
