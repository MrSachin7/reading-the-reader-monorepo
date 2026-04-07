using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed class ExperimentSessionManager : IExperimentSessionManager, IExperimentRuntimeAuthority, IExperimentSessionQueryService
{
    private const int MaxRecentInterventions = 25;
    private const int MaxRecentDecisionHistory = 25;
    private const int MaxRecentContextPreservationEvents = 10;

    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentStateStoreAdapter _experimentStateStoreAdapter;
    private readonly IExperimentReplayExportStoreAdapter _experimentReplayExportStoreAdapter;
    private readonly IReadingInterventionRuntime _readingInterventionRuntime;
    private readonly IReadingInterventionModuleRegistry _interventionModuleRegistry;
    private readonly IDecisionStrategyCoordinator _decisionStrategyCoordinator;
    private readonly IExternalProviderGateway _externalProviderGateway;
    private readonly SemaphoreSlim _lifecycleGate = new(1, 1);
    private readonly ConcurrentDictionary<string, byte> _gazeSubscribers = new();
    private readonly ConcurrentDictionary<string, byte> _participantViewConnections = new();
    private readonly object _historyGate = new();

    private int _isSubscribedToHardware;
    private int _isHardwareTracking;
    private int _isGazeStreamingSuppressed;
    private long _lastLayoutInterventionAppliedAtUnixMs;
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
    private List<RawGazeSampleRecord> _gazeSamples = [];
    private List<ReadingSessionStateRecord> _readingSessionStates = [];
    private List<ParticipantViewportEventRecord> _participantViewportEvents = [];
    private List<ReadingFocusEventRecord> _readingFocusEvents = [];
    private List<ReadingAttentionEventRecord> _attentionEvents = [];
    private List<DecisionProposalEventRecord> _decisionProposalEvents = [];
    private List<InterventionEventRecord> _interventionEvents = [];

    public ExperimentSessionManager(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentStateStoreAdapter experimentStateStoreAdapter,
        IExperimentReplayExportStoreAdapter experimentReplayExportStoreAdapter,
        IReadingInterventionRuntime readingInterventionRuntime,
        IReadingInterventionModuleRegistry interventionModuleRegistry,
        IDecisionStrategyCoordinator decisionStrategyCoordinator,
        IExternalProviderGateway externalProviderGateway)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _experimentStateStoreAdapter = experimentStateStoreAdapter;
        _experimentReplayExportStoreAdapter = experimentReplayExportStoreAdapter;
        _readingInterventionRuntime = readingInterventionRuntime;
        _interventionModuleRegistry = interventionModuleRegistry;
        _decisionStrategyCoordinator = decisionStrategyCoordinator;
        _externalProviderGateway = externalProviderGateway;

        RestoreLatestSnapshot();
    }

    private sealed record InterventionApplicationOutcome(
        InterventionExecutionResult? Execution,
        bool DidUpdateReadingSession);

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
                LatestContextPreservation = null,
                RecentContextPreservationEvents = [],
                LatestLayoutGuardrail = null,
                AttentionSummary = null,
            };
            _lastLayoutInterventionAppliedAtUnixMs = 0;

            nextState = _liveReadingSession.Copy();
            RecordReadingSessionState("reading-session-configured", updatedAtUnixMs, nextState);
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishViewportChangedAsync(GetCurrentSessionId(), viewport, ct);
        }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishReadingFocusChangedAsync(GetCurrentSessionId(), focus, ct);
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return focus;
    }

    public async ValueTask<ReadingContextPreservationEventSnapshot> UpdateReadingContextPreservationAsync(
        UpdateReadingContextPreservationCommand command,
        CancellationToken ct = default)
    {
        ReadingContextPreservationEventSnapshot contextPreservation;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            contextPreservation = NormalizeReadingContextPreservation(command);
            _liveReadingSession = _liveReadingSession with
            {
                LatestContextPreservation = contextPreservation,
                RecentContextPreservationEvents = BuildRecentContextPreservationHistory(
                    _liveReadingSession.RecentContextPreservationEvents,
                    contextPreservation)
            };
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(
            MessageTypes.ReadingContextPreservationChanged,
            contextPreservation,
            ct);
        return contextPreservation;
    }

    public async ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(
        UpdateReadingAttentionSummaryCommand command,
        CancellationToken ct = default)
    {
        ReadingAttentionSummarySnapshot summary;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            summary = NormalizeReadingAttentionSummary(command);
            _liveReadingSession = _liveReadingSession with
            {
                AttentionSummary = summary
            };
            RecordReadingAttentionEvent(updatedAtUnixMs, summary);
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingAttentionSummaryChanged, summary, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishAttentionSummaryChangedAsync(GetCurrentSessionId(), summary, ct);
        }
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
            var outcome = ApplyInterventionCore(command, updatedAtUnixMs);

            if (!outcome.DidUpdateReadingSession)
            {
                if (supersededProposal is not null)
                {
                    await SaveCurrentSnapshotAsync(ct);
                }
                return null;
            }

            interventionEvent = outcome.Execution?.Event.Copy();
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
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), decisionUpdate, ct);
            }
        }

        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
            await _externalProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }
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
            var outcome = ApplyInterventionCore(_decisionState.ActiveProposal.ProposedIntervention, updatedAtUnixMs);
            var resolvedProposal = _decisionState.ActiveProposal.WithResolution(
                DecisionProposalStatus.Approved,
                updatedAtUnixMs,
                NormalizeDecisionResolutionSource(source),
                outcome.Execution?.Event.Id);

            _decisionState = new DecisionRuntimeStateSnapshot(
                _decisionState.AutomationPaused,
                null,
                BuildRecentProposalHistory(_decisionState.RecentProposalHistory, resolvedProposal));

            RecordDecisionProposalEvent(updatedAtUnixMs, resolvedProposal);
            interventionEvent = outcome.Execution?.Event.Copy();
            nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentSnapshotAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
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
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
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
                var outcome = ApplyInterventionCore(proposal.ProposedIntervention, updatedAtUnixMs);
                var autoAppliedProposal = proposal.WithResolution(
                    DecisionProposalStatus.AutoApplied,
                    updatedAtUnixMs,
                    "system",
                    outcome.Execution?.Event.Id);

                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    null,
                    BuildRecentProposalHistory(_decisionState.RecentProposalHistory, autoAppliedProposal));

                RecordDecisionProposalEvent(updatedAtUnixMs, autoAppliedProposal);
                interventionEvent = outcome.Execution?.Event.Copy();
                nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
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
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
            }
        }

        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
        }

        return update ?? BuildDecisionRealtimeUpdate();
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SubmitExternalDecisionProposalAsync(
        ExternalDecisionProposalCommand command,
        CancellationToken ct = default)
    {
        return await ApplyExternalDecisionProposalAsync(command, applyAutonomously: false, ct);
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> RequestExternalAutonomousApplyAsync(
        ExternalDecisionAutonomousApplyCommand command,
        CancellationToken ct = default)
    {
        return await ApplyExternalDecisionProposalAsync(
            new ExternalDecisionProposalCommand(
                command.ProviderId,
                command.SessionId,
                command.CorrelationId,
                Guid.NewGuid().ToString("D"),
                command.ExecutionMode,
                command.Rationale,
                command.SignalSummary,
                command.ProviderObservedAtUnixMs,
                command.RequestedIntervention),
            applyAutonomously: true,
            ct);
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
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
                await _externalProviderGateway.PublishDecisionUpdateAsync(snapshot.SessionId, BuildDecisionRealtimeUpdate(), ct);
            }
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

    public async Task<ExperimentSessionSnapshot> ResetSessionAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (current.IsActive)
            {
                throw new InvalidOperationException("Finish the current session before starting a new one.");
            }

            StopHardwareStreaming();
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 0);
            Interlocked.Exchange(ref _receivedGazeSamples, 0);
            Interlocked.Exchange(ref _eventSequenceNumber, 0);
            Volatile.Write(ref _latestGazeSample, null);
            Volatile.Write(ref _session, ExperimentSession.Inactive);
            _calibrationSnapshot = CalibrationSessionSnapshots.CreateIdle();
            _liveReadingSession = LiveReadingSessionSnapshot.Empty;
            _decisionConfiguration = DecisionConfigurationSnapshot.Default.Copy();
            _decisionState = DecisionRuntimeStateSnapshot.Empty.Copy();
            _lastLayoutInterventionAppliedAtUnixMs = 0;
            ResetReplayHistory();

            var snapshot = GetCurrentSnapshot();
            await _experimentStateStoreAdapter.SaveSnapshotAsync(snapshot, ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentState, snapshot, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
            }
            return snapshot;
        }
        finally
        {
            _lifecycleGate.Release();
        }
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
            Manifest = latest.Manifest with
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
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
                await _externalProviderGateway.PublishDecisionUpdateAsync(snapshot.SessionId, BuildDecisionRealtimeUpdate(), ct);
            }
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
        var setup = BuildSetupSnapshot(session, _calibrationSnapshot, _liveReadingSession);
        var liveMonitoring = BuildLiveMonitoringSnapshot(
            session,
            setup,
            _liveReadingSession,
            Volatile.Read(ref _isHardwareTracking) == 1,
            _gazeSubscribers.Count);

        return new ExperimentSessionSnapshot(
            session.Id,
            session.IsActive,
            session.StartedAtUnixMs,
            session.StoppedAtUnixMs,
            session.Participant?.Copy(),
            session.EyeTrackerDevice?.Copy(),
            _calibrationSnapshot,
            setup,
            Interlocked.Read(ref _receivedGazeSamples),
            latest?.Copy(),
            _clientBroadcasterAdapter.ConnectedClients,
            liveMonitoring,
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
        var shouldPublishToProvider = ShouldPublishToExternalProvider();
        if (_gazeSubscribers.IsEmpty && !shouldPublishToProvider)
        {
            return;
        }

        UpdateGazeSample(gazeData);
        var subscribers = _gazeSubscribers.Keys.ToArray();
        var sendTask = BroadcastGazeSampleAsync(subscribers, shouldPublishToProvider, gazeData);
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

        if (ShouldPublishToExternalProvider())
        {
            var sessionId = GetCurrentSessionId();
            if (viewport is not null)
            {
                await _externalProviderGateway.PublishViewportChangedAsync(sessionId, viewport, ct);
            }

            if (focus is not null)
            {
                await _externalProviderGateway.PublishReadingFocusChangedAsync(sessionId, focus, ct);
            }
        }
    }

    private async Task EnsureGazeStreamingStateAsync(CancellationToken ct)
    {
        var session = Volatile.Read(ref _session);
        var shouldStream = (_gazeSubscribers.IsEmpty ? ShouldPublishToExternalProvider() : true) &&
                           Volatile.Read(ref _isGazeStreamingSuppressed) == 0;

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

    private async ValueTask BroadcastGazeSampleAsync(string[] subscribers, bool shouldPublishToProvider, GazeData gazeData)
    {
        foreach (var connectionId in subscribers)
        {
            await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.GazeSample, gazeData);
        }

        if (shouldPublishToProvider)
        {
            await _externalProviderGateway.PublishGazeSampleAsync(GetCurrentSessionId(), gazeData, CancellationToken.None);
        }
    }

    private async ValueTask<DecisionRealtimeUpdateSnapshot> ApplyExternalDecisionProposalAsync(
        ExternalDecisionProposalCommand command,
        bool applyAutonomously,
        CancellationToken ct)
    {
        DecisionRealtimeUpdateSnapshot update;
        InterventionEventSnapshot? interventionEvent = null;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            ValidateExternalDecisionCommand(command, applyAutonomously);

            var proposal = BuildExternalProposal(command);
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            SupersedeActiveProposal(updatedAtUnixMs, "system");

            if (applyAutonomously)
            {
                var outcome = ApplyInterventionCore(proposal.ProposedIntervention, updatedAtUnixMs);
                var autoAppliedProposal = proposal.WithResolution(
                    DecisionProposalStatus.AutoApplied,
                    updatedAtUnixMs,
                    command.ProviderId,
                    outcome.Execution?.Event.Id);

                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    null,
                    BuildRecentProposalHistory(_decisionState.RecentProposalHistory, autoAppliedProposal));

                RecordDecisionProposalEvent(updatedAtUnixMs, autoAppliedProposal);
                interventionEvent = outcome.Execution?.Event.Copy();
                nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
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

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }

        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
        }

        return update;
    }

    private void ValidateExternalDecisionCommand(ExternalDecisionProposalCommand command, bool applyAutonomously)
    {
        if (!string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.External, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("External decision provider is not active for the current session.");
        }

        if (_decisionState.AutomationPaused)
        {
            throw new InvalidOperationException("Decision automation is paused.");
        }

        var currentSession = Volatile.Read(ref _session);
        if (!currentSession.IsActive || currentSession.Id is null)
        {
            throw new InvalidOperationException("No active experiment session is available.");
        }

        if (!Guid.TryParse(command.SessionId, out var sessionId) || sessionId != currentSession.Id.Value)
        {
            throw new InvalidOperationException("Provider session id does not match the active experiment session.");
        }

        var expectedMode = applyAutonomously
            ? DecisionExecutionModes.Autonomous
            : DecisionExecutionModes.Advisory;
        if (!string.Equals(_decisionConfiguration.ExecutionMode, expectedMode, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Current decision execution mode must be '{expectedMode}' for this provider command.");
        }

        if (!string.Equals(command.ExecutionMode, expectedMode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Provider execution mode does not match the active backend execution mode.");
        }

        IReadingInterventionModule? module = null;
        if (!string.IsNullOrWhiteSpace(command.ProposedIntervention.ModuleId) &&
            !_interventionModuleRegistry.TryResolve(command.ProposedIntervention.ModuleId, out module))
        {
            throw new InvalidOperationException($"Unknown intervention module '{command.ProposedIntervention.ModuleId}'.");
        }

        if (module is not null)
        {
            var validation = module.Validate(new ReadingInterventionRequest(
                module.Descriptor.ModuleId,
                command.ProposedIntervention.Parameters ?? new Dictionary<string, string?>(StringComparer.Ordinal)));
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(validation.ErrorMessage ?? "Provider intervention payload is invalid.");
            }
        }
    }

    private DecisionProposalSnapshot BuildExternalProposal(ExternalDecisionProposalCommand command)
    {
        var proposalId = Guid.TryParse(command.ProposalId, out var parsedProposalId)
            ? parsedProposalId
            : Guid.NewGuid();
        var observedAtUnixMs = Math.Max(command.ProviderObservedAtUnixMs, 0);

        return new DecisionProposalSnapshot(
            proposalId,
            _decisionConfiguration.ConditionLabel,
            command.ProviderId.Trim(),
            _decisionConfiguration.ExecutionMode,
            DecisionProposalStatus.Pending,
            new DecisionSignalSnapshot(
                "external-provider",
                command.SignalSummary.Trim(),
                observedAtUnixMs,
                null),
            command.Rationale.Trim(),
            observedAtUnixMs,
            null,
            null,
            null,
            command.ProposedIntervention.Copy());
    }

    private Guid? GetCurrentSessionId()
    {
        return Volatile.Read(ref _session).Id;
    }

    private bool ShouldPublishToExternalProvider()
    {
        return string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.External, StringComparison.Ordinal);
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
        _lastLayoutInterventionAppliedAtUnixMs =
            _liveReadingSession.LatestLayoutGuardrail is { Status: "applied" }
                ? _liveReadingSession.LatestLayoutGuardrail.EvaluatedAtUnixMs
                : 0;
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
            _attentionEvents = [];
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
            _gazeSamples.Add(new RawGazeSampleRecord(
                NextSequenceNumber(),
                capturedAtUnixMs,
                CalculateElapsedSinceStart(capturedAtUnixMs),
                gazeData.DeviceTimeStamp,
                gazeData.SystemTimeStamp,
                ToReplayEyeSample(
                    gazeData.LeftEyeX,
                    gazeData.LeftEyeY,
                    gazeData.LeftEyeValidity,
                    gazeData.LeftEyePositionInUserX,
                    gazeData.LeftEyePositionInUserY,
                    gazeData.LeftEyePositionInUserZ,
                    gazeData.LeftPupilDiameterMm,
                    gazeData.LeftPupilValidity,
                    gazeData.LeftGazeOriginInUserX,
                    gazeData.LeftGazeOriginInUserY,
                    gazeData.LeftGazeOriginInUserZ,
                    gazeData.LeftGazeOriginValidity,
                    gazeData.LeftGazeOriginInTrackBoxX,
                    gazeData.LeftGazeOriginInTrackBoxY,
                    gazeData.LeftGazeOriginInTrackBoxZ),
                ToReplayEyeSample(
                    gazeData.RightEyeX,
                    gazeData.RightEyeY,
                    gazeData.RightEyeValidity,
                    gazeData.RightEyePositionInUserX,
                    gazeData.RightEyePositionInUserY,
                    gazeData.RightEyePositionInUserZ,
                    gazeData.RightPupilDiameterMm,
                    gazeData.RightPupilValidity,
                    gazeData.RightGazeOriginInUserX,
                    gazeData.RightGazeOriginInUserY,
                    gazeData.RightGazeOriginInUserZ,
                    gazeData.RightGazeOriginValidity,
                    gazeData.RightGazeOriginInTrackBoxX,
                    gazeData.RightGazeOriginInTrackBoxY,
                    gazeData.RightGazeOriginInTrackBoxZ)));
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

    private void RecordReadingAttentionEvent(long occurredAtUnixMs, ReadingAttentionSummarySnapshot summary)
    {
        lock (_historyGate)
        {
            _attentionEvents.Add(new ReadingAttentionEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                CalculateElapsedSinceStart(occurredAtUnixMs),
                summary.Copy()));
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
            var participantViewportEvents = _participantViewportEvents.Select(item => item.Copy()).ToArray();
            var readingFocusEvents = _readingFocusEvents.Select(item => item.Copy()).ToArray();
            var attentionEvents = _attentionEvents.Select(item => item.Copy()).ToArray();
            var decisionProposalEvents = _decisionProposalEvents.Select(item => item.Copy()).ToArray();
            var interventionEvents = _interventionEvents.Select(item => item.Copy()).ToArray();
            long? durationMs = finalSnapshot.StartedAtUnixMs > 0 && finalSnapshot.StoppedAtUnixMs.HasValue
                ? Math.Max(0L, finalSnapshot.StoppedAtUnixMs.Value - finalSnapshot.StartedAtUnixMs)
                : null;
            var content = initialSnapshot.ReadingSession?.Content ?? finalSnapshot.ReadingSession?.Content;
            if (content is null)
            {
                throw new InvalidOperationException("Cannot export a replay without reading content.");
            }

            var baselinePresentation =
                initialSnapshot.ReadingSession?.Presentation?.Copy() ??
                finalSnapshot.ReadingSession?.Presentation?.Copy() ??
                ReadingPresentationSnapshot.Default.Copy();
            var baselineAppearance =
                initialSnapshot.ReadingSession?.Appearance?.Copy() ??
                finalSnapshot.ReadingSession?.Appearance?.Copy() ??
                ReaderAppearanceSnapshot.Default.Copy();
            var validationResult = finalSnapshot.Calibration.Validation.Result ?? finalSnapshot.Calibration.Result?.Validation;

            return new ExperimentReplayExport(
                new ExperimentReplayExportManifest(
                    ExperimentReplayExportSchema.Name,
                    ExperimentReplayExportSchema.Version,
                    exportedAtUnixMs,
                    completionSource,
                    "core",
                    new ExperimentReplayExportProducer(
                        "reading-the-reader",
                        "Tobii.Research.x64",
                        "1.11.0.1334",
                        ExperimentReplayExportSchema.Version.ToString()),
                    null),
                new ExperimentReplayContext(
                    finalSnapshot.SessionId,
                    finalSnapshot.StartedAtUnixMs,
                    finalSnapshot.StoppedAtUnixMs,
                    durationMs,
                    finalSnapshot.DecisionConfiguration.Copy(),
                    finalSnapshot.Participant is null
                        ? null
                        : new ExperimentReplayParticipant(
                            finalSnapshot.Participant.Name,
                            finalSnapshot.Participant.Age,
                            finalSnapshot.Participant.Sex,
                            finalSnapshot.Participant.ExistingEyeCondition,
                            finalSnapshot.Participant.ReadingProficiency),
                    finalSnapshot.EyeTrackerDevice is null
                        ? null
                        : new ExperimentReplayDevice(
                            finalSnapshot.EyeTrackerDevice.Name,
                            finalSnapshot.EyeTrackerDevice.Model,
                            finalSnapshot.EyeTrackerDevice.SerialNumber,
                            finalSnapshot.EyeTrackerDevice.HasSavedLicence),
                    new ExperimentReplayCalibrationSummary(
                        NormalizeNullableText(finalSnapshot.Calibration.Pattern),
                        CalibrationSessionSnapshots.IsApplied(finalSnapshot.Calibration),
                        validationResult?.Passed == true,
                        NormalizeNullableText(validationResult?.Quality),
                        validationResult?.AverageAccuracyDegrees,
                        validationResult?.AveragePrecisionDegrees,
                        validationResult?.SampleCount ?? 0),
                    lifecycleEvents),
                new ExperimentReplayContent(
                    content.DocumentId,
                    content.Title,
                    content.Markdown,
                    content.SourceSetupId,
                    content.UpdatedAtUnixMs,
                    ComputeContentHash(content.Markdown),
                    new ExperimentReplayContentTokenization("minimal-markdown", "v1")),
                new ExperimentReplaySensing(gazeSamples),
                new ExperimentReplayDerived(
                    participantViewportEvents,
                    readingFocusEvents,
                    attentionEvents),
                new ExperimentReplayInterventions(
                    decisionProposalEvents,
                    interventionEvents),
                new ExperimentReplayData(
                    new ExperimentReplayBaseline(
                        baselinePresentation,
                        baselineAppearance)),
                []);
        }
    }

    private static ReplayEyeSample ToReplayEyeSample(
        float x,
        float y,
        string validity,
        float? positionInUserX,
        float? positionInUserY,
        float? positionInUserZ,
        float? pupilDiameterMm,
        string pupilValidity,
        float? gazeOriginInUserX,
        float? gazeOriginInUserY,
        float? gazeOriginInUserZ,
        string gazeOriginValidity,
        float? gazeOriginInTrackBoxX,
        float? gazeOriginInTrackBoxY,
        float? gazeOriginInTrackBoxZ)
    {
        return new ReplayEyeSample(
            new ReplayEyePoint2D(x, y, string.IsNullOrWhiteSpace(validity) ? "Invalid" : validity),
            new ReplayEyePoint3D(positionInUserX, positionInUserY, positionInUserZ),
            new ReplayEyePupil(pupilDiameterMm, string.IsNullOrWhiteSpace(pupilValidity) ? "Invalid" : pupilValidity),
            new ReplayEyeOrigin3D(
                gazeOriginInUserX,
                gazeOriginInUserY,
                gazeOriginInUserZ,
                string.IsNullOrWhiteSpace(gazeOriginValidity) ? "Invalid" : gazeOriginValidity),
            new ReplayEyeTrackBoxPoint(
                gazeOriginInTrackBoxX,
                gazeOriginInTrackBoxY,
                gazeOriginInTrackBoxZ));
    }

    private static string ComputeContentHash(string markdown)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(markdown));
        return Convert.ToHexString(bytes).ToLowerInvariant();
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

    private static ExperimentLiveMonitoringSnapshot BuildLiveMonitoringSnapshot(
        ExperimentSession session,
        ExperimentSetupSnapshot setup,
        LiveReadingSessionSnapshot liveReadingSession,
        bool isGazeStreamingActive,
        int gazeSubscriberCount)
    {
        var participantViewport = liveReadingSession.ParticipantViewport ?? ParticipantViewportSnapshot.Disconnected;
        var focus = liveReadingSession.Focus ?? ReadingFocusSnapshot.Empty;
        var hasParticipantViewportData =
            participantViewport.IsConnected &&
            participantViewport.ViewportWidthPx > 0 &&
            participantViewport.ViewportHeightPx > 0 &&
            participantViewport.UpdatedAtUnixMs > 0;
        var hasReadingFocusSignal = focus.UpdatedAtUnixMs > 0;

        return new ExperimentLiveMonitoringSnapshot(
            setup.IsReadyForSessionStart && !session.IsActive,
            session.IsActive,
            isGazeStreamingActive,
            Math.Max(gazeSubscriberCount, 0),
            participantViewport.IsConnected,
            hasParticipantViewportData,
            participantViewport.UpdatedAtUnixMs > 0 ? participantViewport.UpdatedAtUnixMs : null,
            hasReadingFocusSignal,
            focus.UpdatedAtUnixMs > 0 ? focus.UpdatedAtUnixMs : null);
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

    private static IReadOnlyList<ReadingContextPreservationEventSnapshot> BuildRecentContextPreservationHistory(
        IReadOnlyList<ReadingContextPreservationEventSnapshot>? existing,
        ReadingContextPreservationEventSnapshot next)
    {
        var items = existing is null
            ? new List<ReadingContextPreservationEventSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());
        items = items
            .OrderByDescending(item => item.MeasuredAtUnixMs)
            .ToList();

        if (items.Count > MaxRecentContextPreservationEvents)
        {
            items.RemoveRange(MaxRecentContextPreservationEvents, items.Count - MaxRecentContextPreservationEvents);
        }

        return items;
    }

    private static LayoutInterventionGuardrailSnapshot BuildLayoutGuardrailSnapshot(
        string status,
        string? reason,
        IReadOnlyList<string> affectedProperties,
        long evaluatedAtUnixMs,
        long? cooldownUntilUnixMs)
    {
        return new LayoutInterventionGuardrailSnapshot(
            LayoutInterventionGuardrailSnapshot.NormalizeStatus(status),
            NormalizeNullableText(reason),
            affectedProperties is null
                ? []
                : affectedProperties
                    .Select(LayoutInterventionGuardrailSnapshot.NormalizeAffectedProperty)
                    .Distinct(StringComparer.Ordinal)
                    .ToArray(),
            Math.Max(evaluatedAtUnixMs, 0),
            cooldownUntilUnixMs.HasValue ? Math.Max(cooldownUntilUnixMs.Value, 0) : null);
    }

    private InterventionApplicationOutcome ApplyInterventionCore(ApplyInterventionCommand command, long appliedAtUnixMs)
    {
        var requestedLayoutProperties = ReadingInterventionRuntime.GetRequestedLayoutProperties(command);
        var execution = _readingInterventionRuntime.Apply(
            _liveReadingSession.Presentation,
            _liveReadingSession.Appearance,
            command,
            appliedAtUnixMs);

        if (execution is null)
        {
            if (requestedLayoutProperties.Count > 0)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "no-op-layout-change",
                        requestedLayoutProperties,
                        appliedAtUnixMs,
                        null)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            return new InterventionApplicationOutcome(null, false);
        }

        var layoutChange = ReadingInterventionRuntime.SummarizeLayoutChange(
            _liveReadingSession.Presentation,
            execution.Presentation);
        var latestLayoutGuardrail = _liveReadingSession.LatestLayoutGuardrail;

        if (layoutChange.IsLayoutAffecting)
        {
            if (layoutChange.ExceedsMaximumStep)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "change-too-large",
                        layoutChange.ChangedProperties,
                        appliedAtUnixMs,
                        null)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            var cooldownUntilUnixMs = _lastLayoutInterventionAppliedAtUnixMs > 0
                ? _lastLayoutInterventionAppliedAtUnixMs + ReadingInterventionRuntime.LayoutChangeCooldownMs
                : (long?)null;
            if (cooldownUntilUnixMs.HasValue && appliedAtUnixMs < cooldownUntilUnixMs.Value)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "cooldown-active",
                        layoutChange.ChangedProperties,
                        appliedAtUnixMs,
                        cooldownUntilUnixMs)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            latestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                "applied",
                null,
                layoutChange.ChangedProperties,
                appliedAtUnixMs,
                appliedAtUnixMs + ReadingInterventionRuntime.LayoutChangeCooldownMs);
            _lastLayoutInterventionAppliedAtUnixMs = appliedAtUnixMs;
        }

        _liveReadingSession = _liveReadingSession with
        {
            Presentation = execution.Presentation.Copy(),
            Appearance = execution.Appearance.Copy(),
            LatestLayoutGuardrail = latestLayoutGuardrail?.Copy(),
            LatestIntervention = execution.Event.Copy(),
            RecentInterventions = BuildRecentInterventionHistory(
                _liveReadingSession.RecentInterventions,
                execution.Event)
        };

        RecordInterventionEvent(appliedAtUnixMs, execution.Event);
        RecordReadingSessionState("intervention-applied", appliedAtUnixMs, _liveReadingSession.Copy());
        return new InterventionApplicationOutcome(execution, true);
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

    private static ReadingContextPreservationEventSnapshot NormalizeReadingContextPreservation(
        UpdateReadingContextPreservationCommand command)
    {
        return new ReadingContextPreservationEventSnapshot(
            ReadingContextPreservationEventSnapshot.NormalizeStatus(command.Status),
            ReadingContextPreservationEventSnapshot.NormalizeAnchorSource(command.AnchorSource),
            NormalizeNullableText(command.AnchorTokenId),
            NormalizeNullableText(command.AnchorBlockId),
            command.AnchorErrorPx.HasValue ? Math.Max(command.AnchorErrorPx.Value, 0) : null,
            command.ViewportDeltaPx,
            Math.Max(command.InterventionAppliedAtUnixMs, 0),
            Math.Max(command.MeasuredAtUnixMs, 0),
            NormalizeNullableText(command.Reason));
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
