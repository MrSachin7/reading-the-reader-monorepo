using System.Collections.Concurrent;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class ExperimentSessionManager : IExperimentSessionManager, IExperimentRuntimeAuthority, IExperimentSessionQueryService
{
    private const int MaxRecentInterventions = 25;
    private const int MaxRecentDecisionHistory = 25;

    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentStateStoreAdapter _experimentStateStoreAdapter;
    private readonly IExperimentReplayExportStoreAdapter _experimentReplayExportStoreAdapter;
    private readonly IReadingInterventionRuntime _readingInterventionRuntime;
    private readonly IReadingInterventionModuleRegistry _interventionModuleRegistry;
    private readonly IDecisionStrategyCoordinator _decisionStrategyCoordinator;
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
    private DecisionConfigurationSnapshot _decisionConfiguration = DecisionConfigurationSnapshot.Default;
    private DecisionRuntimeStateSnapshot _decisionState = DecisionRuntimeStateSnapshot.Empty;
    private ExperimentSessionSnapshot? _initialSnapshot;
    private List<ExperimentLifecycleEventRecord> _lifecycleEvents = [];
    private List<GazeSampleRecord> _gazeSamples = [];
    private List<ReadingSessionStateRecord> _readingSessionStates = [];
    private List<ParticipantViewportEventRecord> _participantViewportEvents = [];
    private List<ReadingFocusEventRecord> _readingFocusEvents = [];
    private List<DecisionProposalEventRecord> _decisionProposalEvents = [];
    private List<InterventionEventRecord> _interventionEvents = [];

    public ExperimentSessionManager(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentStateStoreAdapter experimentStateStoreAdapter,
        IExperimentReplayExportStoreAdapter experimentReplayExportStoreAdapter,
        IReadingInterventionRuntime readingInterventionRuntime,
        IReadingInterventionModuleRegistry interventionModuleRegistry,
        IDecisionStrategyCoordinator decisionStrategyCoordinator)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _experimentStateStoreAdapter = experimentStateStoreAdapter;
        _experimentReplayExportStoreAdapter = experimentReplayExportStoreAdapter;
        _readingInterventionRuntime = readingInterventionRuntime;
        _interventionModuleRegistry = interventionModuleRegistry;
        _decisionStrategyCoordinator = decisionStrategyCoordinator;

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
                AttentionSummary = null,
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
        await EvaluateDecisionStrategiesAsync(ct);
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
        await EvaluateDecisionStrategiesAsync(ct);
        return focus;
    }

    public async ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(
        UpdateReadingAttentionSummaryCommand command,
        CancellationToken ct = default)
    {
        ReadingAttentionSummarySnapshot summary;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            summary = NormalizeReadingAttentionSummary(command);
            _liveReadingSession = _liveReadingSession with
            {
                AttentionSummary = summary
            };
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingAttentionSummaryChanged, summary, ct);
        await EvaluateDecisionStrategiesAsync(ct);
        return summary;
    }

    public async ValueTask<InterventionEventSnapshot?> ApplyInterventionAsync(
        ApplyInterventionCommand command,
        CancellationToken ct = default)
    {
        InterventionEventSnapshot? interventionEvent;
        LiveReadingSessionSnapshot? nextState = null;
        DecisionRealtimeUpdateSnapshot? decisionUpdate = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var supersededProposal = SupersedeActiveProposal(updatedAtUnixMs, "researcher");
            var execution = ApplyInterventionCore(command, updatedAtUnixMs);

            if (execution is null)
            {
                if (supersededProposal is not null)
                {
                    await SaveCurrentSnapshotAsync(ct);
                }
                return null;
            }

            interventionEvent = execution.Event.Copy();
            nextState = _liveReadingSession.Copy();
            decisionUpdate = supersededProposal is null ? null : BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (decisionUpdate is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, decisionUpdate, ct);
        }

        if (interventionEvent is not null && nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
        }

        return interventionEvent;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> UpdateDecisionConfigurationAsync(
        DecisionConfigurationSnapshot configuration,
        bool automationPaused,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var normalizedConfiguration = NormalizeDecisionConfiguration(configuration);
            var providerChanged = !string.Equals(
                _decisionConfiguration.ProviderId,
                normalizedConfiguration.ProviderId,
                StringComparison.Ordinal);
            var executionModeChanged = !string.Equals(
                _decisionConfiguration.ExecutionMode,
                normalizedConfiguration.ExecutionMode,
                StringComparison.Ordinal);

            _decisionConfiguration = normalizedConfiguration;
            _decisionState = _decisionState with
            {
                AutomationPaused = automationPaused
            };

            if (providerChanged || executionModeChanged)
            {
                SupersedeActiveProposal(updatedAtUnixMs, "system");
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        await EvaluateDecisionStrategiesAsync(ct);
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> ApproveDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;
        InterventionEventSnapshot? interventionEvent;
        LiveReadingSessionSnapshot? nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.ActiveProposal is null ||
                _decisionState.ActiveProposal.ProposalId != proposalId)
            {
                throw new InvalidOperationException("No active decision proposal matches the supplied id.");
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var execution = ApplyInterventionCore(_decisionState.ActiveProposal.ProposedIntervention, updatedAtUnixMs);
            var resolvedProposal = _decisionState.ActiveProposal.WithResolution(
                DecisionProposalStatus.Approved,
                updatedAtUnixMs,
                NormalizeDecisionResolutionSource(source),
                execution?.Event.Id);

            _decisionState = new DecisionRuntimeStateSnapshot(
                _decisionState.AutomationPaused,
                null,
                BuildRecentProposalHistory(_decisionState.RecentProposalHistory, resolvedProposal));

            RecordDecisionProposalEvent(updatedAtUnixMs, resolvedProposal);
            interventionEvent = execution?.Event.Copy();
            nextState = execution is null ? null : _liveReadingSession.Copy();
            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (interventionEvent is not null && nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
        }

        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> RejectDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.ActiveProposal is null ||
                _decisionState.ActiveProposal.ProposalId != proposalId)
            {
                throw new InvalidOperationException("No active decision proposal matches the supplied id.");
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var rejectedProposal = _decisionState.ActiveProposal.WithResolution(
                DecisionProposalStatus.Rejected,
                updatedAtUnixMs,
                NormalizeDecisionResolutionSource(source));

            _decisionState = new DecisionRuntimeStateSnapshot(
                _decisionState.AutomationPaused,
                null,
                BuildRecentProposalHistory(_decisionState.RecentProposalHistory, rejectedProposal));

            RecordDecisionProposalEvent(updatedAtUnixMs, rejectedProposal);
            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionAutomationPausedAsync(
        bool automationPaused,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _decisionState = _decisionState with
            {
                AutomationPaused = automationPaused
            };

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (!automationPaused)
        {
            await EvaluateDecisionStrategiesAsync(ct);
        }

        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionExecutionModeAsync(
        string executionMode,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var normalizedExecutionMode = NormalizeExecutionMode(executionMode);
            var executionModeChanged = !string.Equals(
                _decisionConfiguration.ExecutionMode,
                normalizedExecutionMode,
                StringComparison.Ordinal);

            _decisionConfiguration = _decisionConfiguration with
            {
                ExecutionMode = normalizedExecutionMode
            };

            if (executionModeChanged)
            {
                SupersedeActiveProposal(updatedAtUnixMs, "system");
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        await EvaluateDecisionStrategiesAsync(ct);
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> EvaluateDecisionStrategiesAsync(CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot? update = null;
        InterventionEventSnapshot? interventionEvent = null;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.AutomationPaused ||
                string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.Manual, StringComparison.Ordinal))
            {
                return BuildDecisionRealtimeUpdate();
            }

            var currentSnapshot = GetCurrentSnapshot();
            var proposal = await _decisionStrategyCoordinator.EvaluateAsync(
                currentSnapshot,
                _decisionConfiguration,
                _decisionState,
                ct);

            if (proposal is null)
            {
                return BuildDecisionRealtimeUpdate();
            }

            if (_decisionState.ActiveProposal is not null &&
                DecisionProposalLifecycleRules.CanTransition(
                    _decisionState.ActiveProposal.Status,
                    DecisionProposalStatus.Superseded) &&
                ProposalsMatch(_decisionState.ActiveProposal, proposal))
            {
                return BuildDecisionRealtimeUpdate();
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            SupersedeActiveProposal(updatedAtUnixMs, "system");

            if (string.Equals(_decisionConfiguration.ExecutionMode, DecisionExecutionModes.Autonomous, StringComparison.Ordinal))
            {
                var execution = ApplyInterventionCore(proposal.ProposedIntervention, updatedAtUnixMs);
                var autoAppliedProposal = proposal.WithResolution(
                    DecisionProposalStatus.AutoApplied,
                    updatedAtUnixMs,
                    "system",
                    execution?.Event.Id);

                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    null,
                    BuildRecentProposalHistory(_decisionState.RecentProposalHistory, autoAppliedProposal));

                RecordDecisionProposalEvent(updatedAtUnixMs, autoAppliedProposal);
                interventionEvent = execution?.Event.Copy();
                nextState = execution is null ? null : _liveReadingSession.Copy();
            }
            else
            {
                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    proposal.Copy(),
                    _decisionState.RecentProposalHistory is null
                        ? []
                        : [.. _decisionState.RecentProposalHistory.Select(item => item.Copy())]);
                RecordDecisionProposalEvent(updatedAtUnixMs, proposal);
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (update is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        }

        if (interventionEvent is not null && nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
        }

        return update ?? BuildDecisionRealtimeUpdate();
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
            _decisionState = new DecisionRuntimeStateSnapshot(_decisionState.AutomationPaused, null, []);
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
            _liveReadingSession.Copy(),
            _decisionConfiguration.Copy(),
            _decisionState.Copy());
    }

    public IReadOnlyList<ReadingInterventionModuleDescriptor> GetInterventionModules()
    {
        return _interventionModuleRegistry.List();
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

    public async ValueTask SubscribeGazeDataAsync(string connectionId, CancellationToken ct = default)
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

    public async ValueTask UnsubscribeGazeDataAsync(string connectionId, CancellationToken ct = default)
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

    public async ValueTask DisconnectParticipantViewAsync(string connectionId, CancellationToken ct = default)
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
        _decisionConfiguration = snapshot.DecisionConfiguration?.Copy() ?? DecisionConfigurationSnapshot.Default.Copy();
        _decisionState = snapshot.DecisionState?.Copy() ?? DecisionRuntimeStateSnapshot.Empty.Copy();
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
            _decisionProposalEvents = [];
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

    private void RecordDecisionProposalEvent(long occurredAtUnixMs, DecisionProposalSnapshot proposal)
    {
        lock (_historyGate)
        {
            _decisionProposalEvents.Add(new DecisionProposalEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                proposal.Copy()));
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
            var decisionProposalEvents = _decisionProposalEvents.Select(item => item.Copy()).ToArray();
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
                    decisionProposalEvents.Length,
                    interventionEvents.Length),
                initialSnapshot,
                finalSnapshot.Copy(),
                lifecycleEvents,
                gazeSamples,
                readingSessionStates,
                participantViewportEvents,
                readingFocusEvents,
                decisionProposalEvents,
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
        const string eyeTrackerBlockReason = "Select and license an eye tracker before starting the session.";
        const string participantBlockReason = "Save the participant information before starting the session.";
        const string calibrationBlockReason = "Calibration validation must pass before the session can start.";
        const string readingMaterialBlockReason = "Choose the reading material before starting the session.";

        var hasSelectedEyeTracker = session.EyeTrackerDevice is not null &&
                                    !string.IsNullOrWhiteSpace(session.EyeTrackerDevice.SerialNumber);
        var hasAppliedLicence = hasSelectedEyeTracker;
        var hasSavedLicence = session.EyeTrackerDevice?.HasSavedLicence == true;
        var eyeTracker = new EyeTrackerSetupReadinessSnapshot(
            hasSelectedEyeTracker && hasAppliedLicence,
            hasSelectedEyeTracker,
            hasAppliedLicence,
            hasSavedLicence,
            hasSelectedEyeTracker && !hasSavedLicence,
            NormalizeNullableText(session.EyeTrackerDevice?.SerialNumber),
            NormalizeNullableText(session.EyeTrackerDevice?.Name),
            hasSelectedEyeTracker && hasAppliedLicence ? null : eyeTrackerBlockReason);

        var hasParticipant = session.Participant is not null &&
                             !string.IsNullOrWhiteSpace(session.Participant.Name);
        var participant = new ParticipantSetupReadinessSnapshot(
            hasParticipant,
            hasParticipant,
            NormalizeNullableText(session.Participant?.Name),
            hasParticipant ? null : participantBlockReason);

        var validationResult = calibrationSnapshot.Validation.Result ?? calibrationSnapshot.Result?.Validation;
        var isCalibrationApplied = CalibrationSessionSnapshots.IsApplied(calibrationSnapshot);
        var isValidationPassed = validationResult?.Passed == true;
        var calibration = new CalibrationSetupReadinessSnapshot(
            isCalibrationApplied && isValidationPassed,
            calibrationSnapshot.SessionId.HasValue,
            isCalibrationApplied,
            isValidationPassed,
            string.IsNullOrWhiteSpace(calibrationSnapshot.Status) ? "idle" : calibrationSnapshot.Status,
            string.IsNullOrWhiteSpace(calibrationSnapshot.Validation.Status) ? "idle" : calibrationSnapshot.Validation.Status,
            NormalizeNullableText(validationResult?.Quality),
            validationResult?.AverageAccuracyDegrees,
            validationResult?.AveragePrecisionDegrees,
            validationResult?.SampleCount ?? 0,
            isCalibrationApplied && isValidationPassed ? null : calibrationBlockReason);

        var hasReadingMaterial = liveReadingSession.Content is not null &&
                                 !string.IsNullOrWhiteSpace(liveReadingSession.Content.Markdown);
        var usesSavedSetup = hasReadingMaterial && liveReadingSession.Content?.UsesSavedSetup == true;
        var allowsResearcherPresentationChanges = hasReadingMaterial && liveReadingSession.Presentation.EditableByResearcher;
        var readingMaterial = new ReadingMaterialSetupReadinessSnapshot(
            hasReadingMaterial,
            hasReadingMaterial,
            NormalizeNullableText(liveReadingSession.Content?.DocumentId),
            NormalizeNullableText(liveReadingSession.Content?.Title),
            NormalizeNullableText(liveReadingSession.Content?.SourceSetupId),
            usesSavedSetup,
            hasReadingMaterial ? liveReadingSession.Content?.UpdatedAtUnixMs : null,
            allowsResearcherPresentationChanges,
            hasReadingMaterial && liveReadingSession.Presentation.IsPresentationLocked,
            hasReadingMaterial ? null : readingMaterialBlockReason);

        var currentStepIndex = 3;
        ExperimentSetupBlockerSnapshot? blocker = null;

        if (!eyeTracker.IsReady)
        {
            currentStepIndex = 0;
            blocker = new ExperimentSetupBlockerSnapshot("eye-tracker", "Eye tracker", eyeTracker.BlockReason ?? eyeTrackerBlockReason);
        }
        else if (!participant.IsReady)
        {
            currentStepIndex = 1;
            blocker = new ExperimentSetupBlockerSnapshot("participant", "Participant", participant.BlockReason ?? participantBlockReason);
        }
        else if (!calibration.IsReady)
        {
            currentStepIndex = 2;
            blocker = new ExperimentSetupBlockerSnapshot("calibration", "Calibration", calibration.BlockReason ?? calibrationBlockReason);
        }
        else if (!readingMaterial.IsReady)
        {
            currentStepIndex = 3;
            blocker = new ExperimentSetupBlockerSnapshot("reading-material", "Reading material", readingMaterial.BlockReason ?? readingMaterialBlockReason);
        }

        return new ExperimentSetupSnapshot(
            blocker is null,
            currentStepIndex,
            blocker,
            eyeTracker,
            participant,
            calibration,
            readingMaterial);
    }

    private static void EnsureSetupIsReadyForStart(
        ExperimentSession session,
        CalibrationSessionSnapshot calibrationSnapshot,
        LiveReadingSessionSnapshot liveReadingSession)
    {
        var setup = BuildSetupSnapshot(session, calibrationSnapshot, liveReadingSession);
        if (setup.IsReadyForSessionStart)
        {
            return;
        }

        throw new InvalidOperationException(
            setup.CurrentBlocker?.Reason ?? "Complete setup before starting the session.");
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

    private InterventionExecutionResult? ApplyInterventionCore(ApplyInterventionCommand command, long appliedAtUnixMs)
    {
        var execution = _readingInterventionRuntime.Apply(
            _liveReadingSession.Presentation,
            _liveReadingSession.Appearance,
            command,
            appliedAtUnixMs);

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

        RecordInterventionEvent(appliedAtUnixMs, execution.Event);
        RecordReadingSessionState("intervention-applied", appliedAtUnixMs, _liveReadingSession.Copy());
        return execution;
    }

    private DecisionProposalSnapshot? SupersedeActiveProposal(long resolvedAtUnixMs, string resolutionSource)
    {
        if (_decisionState.ActiveProposal is null ||
            !DecisionProposalLifecycleRules.CanTransition(
                _decisionState.ActiveProposal.Status,
                DecisionProposalStatus.Superseded))
        {
            return null;
        }

        var supersededProposal = _decisionState.ActiveProposal.WithResolution(
            DecisionProposalStatus.Superseded,
            resolvedAtUnixMs,
            NormalizeDecisionResolutionSource(resolutionSource));

        _decisionState = new DecisionRuntimeStateSnapshot(
            _decisionState.AutomationPaused,
            null,
            BuildRecentProposalHistory(_decisionState.RecentProposalHistory, supersededProposal));
        RecordDecisionProposalEvent(resolvedAtUnixMs, supersededProposal);

        return supersededProposal;
    }

    private DecisionRealtimeUpdateSnapshot BuildDecisionRealtimeUpdate()
    {
        return new DecisionRealtimeUpdateSnapshot(
            _decisionConfiguration.Copy(),
            _decisionState.Copy());
    }

    private static IReadOnlyList<DecisionProposalSnapshot> BuildRecentProposalHistory(
        IReadOnlyList<DecisionProposalSnapshot>? existing,
        DecisionProposalSnapshot next)
    {
        var items = existing is null
            ? new List<DecisionProposalSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());

        if (items.Count > MaxRecentDecisionHistory)
        {
            items.RemoveRange(MaxRecentDecisionHistory, items.Count - MaxRecentDecisionHistory);
        }

        return items;
    }

    private static DecisionConfigurationSnapshot NormalizeDecisionConfiguration(DecisionConfigurationSnapshot configuration)
    {
        return new DecisionConfigurationSnapshot(
            string.IsNullOrWhiteSpace(configuration.ConditionLabel)
                ? DecisionConfigurationSnapshot.Default.ConditionLabel
                : configuration.ConditionLabel.Trim(),
            NormalizeProviderId(configuration.ProviderId),
            NormalizeExecutionMode(configuration.ExecutionMode));
    }

    private static string NormalizeProviderId(string? providerId)
    {
        if (string.Equals(providerId?.Trim(), DecisionProviderIds.RuleBased, StringComparison.OrdinalIgnoreCase))
        {
            return DecisionProviderIds.RuleBased;
        }

        if (string.Equals(providerId?.Trim(), DecisionProviderIds.External, StringComparison.OrdinalIgnoreCase))
        {
            return DecisionProviderIds.External;
        }

        return DecisionProviderIds.Manual;
    }

    private static string NormalizeExecutionMode(string? executionMode)
    {
        return string.Equals(executionMode?.Trim(), DecisionExecutionModes.Autonomous, StringComparison.OrdinalIgnoreCase)
            ? DecisionExecutionModes.Autonomous
            : DecisionExecutionModes.Advisory;
    }

    private static string NormalizeDecisionResolutionSource(string? source)
    {
        return string.IsNullOrWhiteSpace(source) ? "system" : source.Trim();
    }

    private static bool ProposalsMatch(DecisionProposalSnapshot current, DecisionProposalSnapshot next)
    {
        return current with
        {
            ProposalId = Guid.Empty,
            ProposedAtUnixMs = 0,
            ResolvedAtUnixMs = null,
            ResolutionSource = null,
            AppliedInterventionId = null
        } == next with
        {
            ProposalId = Guid.Empty,
            ProposedAtUnixMs = 0,
            ResolvedAtUnixMs = null,
            ResolutionSource = null,
            AppliedInterventionId = null
        };
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

    private static ReadingAttentionSummarySnapshot NormalizeReadingAttentionSummary(
        UpdateReadingAttentionSummaryCommand command)
    {
        var tokenStats = new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal);

        if (command.TokenStats is not null)
        {
            foreach (var entry in command.TokenStats)
            {
                var tokenId = NormalizeNullableText(entry.Key);
                if (tokenId is null)
                {
                    continue;
                }

                var stats = entry.Value ?? new ReadingAttentionTokenSnapshot(0, 0, 0, 0, 0);
                tokenStats[tokenId] = new ReadingAttentionTokenSnapshot(
                    Math.Max(stats.FixationMs, 0),
                    Math.Max(stats.FixationCount, 0),
                    Math.Max(stats.SkimCount, 0),
                    Math.Max(stats.MaxFixationMs, 0),
                    Math.Max(stats.LastFixationMs, 0));
            }
        }

        return new ReadingAttentionSummarySnapshot(
            Math.Max(command.UpdatedAtUnixMs, 0),
            tokenStats,
            NormalizeNullableText(command.CurrentTokenId),
            command.CurrentTokenDurationMs.HasValue ? Math.Max(command.CurrentTokenDurationMs.Value, 0) : null,
            Math.Max(command.FixatedTokenCount, 0),
            Math.Max(command.SkimmedTokenCount, 0));
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
