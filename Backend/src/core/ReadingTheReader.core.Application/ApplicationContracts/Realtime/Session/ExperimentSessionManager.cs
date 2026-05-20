using System.Collections.Concurrent;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager : IExperimentSessionManager, IExperimentRuntimeAuthority, IExperimentSessionQueryService, IExperimentReplayRecoveryBuffer
{
    private const int MaxRecentInterventions = 25;
    private const int MaxRecentDecisionHistory = 25;
    private const int MaxRecentContextPreservationEvents = 10;

    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;
    private readonly IExperimentStateStoreAdapter _experimentStateStoreAdapter;
    private readonly IExperimentReplayExportStoreAdapter _experimentReplayExportStoreAdapter;
    private readonly IExperimentReplayRecoveryStoreAdapter _experimentReplayRecoveryStoreAdapter;
    private readonly ExperimentSetupTestingOptions _experimentSetupTestingOptions;
    private readonly IReadingInterventionRuntime _readingInterventionRuntime;
    private readonly IReadingInterventionModuleRegistry _interventionModuleRegistry;
    private readonly IEyeMovementAnalysisStrategyCoordinator _eyeMovementAnalysisStrategyCoordinator;
    private readonly IDecisionStrategyCoordinator _decisionStrategyCoordinator;
    private readonly IAnalysisProviderGateway _analysisProviderGateway;
    private readonly IExternalProviderGateway _externalProviderGateway;
    private readonly IAnalysisProviderConnectionRegistry _analysisProviderConnectionRegistry;
    private readonly IProviderConnectionRegistry _providerConnectionRegistry;
    private readonly ISensingModeSettingsService _sensingModeSettingsService;
    private readonly CalibrationOptions _calibrationOptions;
    private readonly SemaphoreSlim _lifecycleGate = new(1, 1);
    private readonly ConcurrentDictionary<string, byte> _gazeSubscribers = new();
    private readonly ConcurrentDictionary<string, byte> _participantViewConnections = new();
    private readonly object _historyGate = new();

    private int _isSubscribedToHardware;
    private int _isHardwareTracking;
    private int _isGazeStreamingSuppressed;
    private long _lastLayoutInterventionAppliedAtUnixMs;
    private long _receivedGazeSamples;
    private long _receivedWebcamGazeSamples;
    private long _eventSequenceNumber;
    private GazeData? _latestGazeSample;
    private GazeData? _latestWebcamGazeSample;
    private CalibrationSessionSnapshot _calibrationSnapshot = CalibrationSessionSnapshots.CreateIdle();
    private ExperimentSession _session = ExperimentSession.Inactive;
    private LiveReadingSessionSnapshot _liveReadingSession = LiveReadingSessionSnapshot.Empty;
    private ReadingFocusSnapshot _lastMeaningfulReadingFocus = ReadingFocusSnapshot.Empty;
    private EyeMovementAnalysisConfigurationSnapshot _eyeMovementAnalysisConfiguration = EyeMovementAnalysisConfigurationSnapshot.Default;
    private EyeMovementAnalysisRuntimeState _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisRuntimeState.Empty;
    private DecisionConfigurationSnapshot _decisionConfiguration = DecisionConfigurationSnapshot.Default;
    private DecisionRuntimeStateSnapshot _decisionState = DecisionRuntimeStateSnapshot.Empty;
    private Guid? _activeReplayRecoverySessionId;
    private bool _hasPendingReplayPersistence;
    private List<ExperimentLifecycleEventRecord> _pendingLifecycleEvents = [];
    private List<RawGazeSampleRecord> _pendingGazeSamples = [];
    private List<WebcamGazeSampleRecord> _pendingWebcamGazeSamples = [];
    private List<EnrichedGazeSampleRecord> _pendingEnrichedGazeSamples = [];
    private List<WebcamSensingStatusRecord> _pendingWebcamStatusEvents = [];
    private List<FacialObservationRecord> _pendingFacialObservationEvents = [];
    private List<FacialDifficultyEventRecord> _pendingFacialDifficultyEvents = [];
    private List<ReadingSessionStateRecord> _pendingReadingSessionStates = [];
    private List<ParticipantViewportEventRecord> _pendingParticipantViewportEvents = [];
    private List<ReadingFocusEventRecord> _pendingReadingFocusEvents = [];
    private List<ReadingAttentionEventRecord> _pendingAttentionEvents = [];
    private List<ReadingContextPreservationEventRecord> _pendingContextPreservationEvents = [];
    private List<DecisionProposalEventRecord> _pendingDecisionProposalEvents = [];
    private List<ScheduledInterventionEventRecord> _pendingScheduledInterventionEvents = [];
    private List<InterventionEventRecord> _pendingInterventionEvents = [];
    private List<QuizAnswerRecord> _pendingQuizAnswerEvents = [];
    private IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? _latestAttentionTokenStats;
    private WebcamSensingStatusSnapshot _webcamStatus = WebcamSensingStatusSnapshot.Default;

    public ExperimentSessionManager(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IClientBroadcasterAdapter clientBroadcasterAdapter,
        IExperimentStateStoreAdapter experimentStateStoreAdapter,
        IExperimentReplayExportStoreAdapter experimentReplayExportStoreAdapter,
        IExperimentReplayRecoveryStoreAdapter experimentReplayRecoveryStoreAdapter,
        CalibrationOptions calibrationOptions,
        ExperimentSetupTestingOptions experimentSetupTestingOptions,
        IReadingInterventionRuntime readingInterventionRuntime,
        IReadingInterventionModuleRegistry interventionModuleRegistry,
        IEyeMovementAnalysisStrategyCoordinator eyeMovementAnalysisStrategyCoordinator,
        IDecisionStrategyCoordinator decisionStrategyCoordinator,
        IAnalysisProviderGateway analysisProviderGateway,
        IExternalProviderGateway externalProviderGateway,
        IAnalysisProviderConnectionRegistry analysisProviderConnectionRegistry,
        IProviderConnectionRegistry providerConnectionRegistry,
        ISensingModeSettingsService sensingModeSettingsService)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
        _experimentStateStoreAdapter = experimentStateStoreAdapter;
        _experimentReplayExportStoreAdapter = experimentReplayExportStoreAdapter;
        _experimentReplayRecoveryStoreAdapter = experimentReplayRecoveryStoreAdapter;
        _calibrationOptions = calibrationOptions;
        _experimentSetupTestingOptions = experimentSetupTestingOptions;
        _readingInterventionRuntime = readingInterventionRuntime;
        _interventionModuleRegistry = interventionModuleRegistry;
        _eyeMovementAnalysisStrategyCoordinator = eyeMovementAnalysisStrategyCoordinator;
        _decisionStrategyCoordinator = decisionStrategyCoordinator;
        _analysisProviderGateway = analysisProviderGateway;
        _externalProviderGateway = externalProviderGateway;
        _analysisProviderConnectionRegistry = analysisProviderConnectionRegistry;
        _providerConnectionRegistry = providerConnectionRegistry;
        _sensingModeSettingsService = sensingModeSettingsService;
    }

    private sealed record InterventionApplicationOutcome(
        InterventionExecutionResult? Execution,
        bool DidUpdateReadingSession);


    public ExperimentSessionSnapshot GetCurrentSnapshot()
    {
        var session = Volatile.Read(ref _session);
        var sensingMode = _sensingModeSettingsService.CurrentMode;
        var signalSources = BuildSignalSourcesSnapshot(sensingMode);
        var latest = signalSources.GazeSource switch
        {
            SensingSignalSources.Webcam => Volatile.Read(ref _latestWebcamGazeSample),
            _ => Volatile.Read(ref _latestGazeSample)
        };
        var setup = BuildSetupSnapshot(session, _calibrationSnapshot, _liveReadingSession);
        var liveMonitoring = BuildLiveMonitoringSnapshot(
            session,
            setup,
            _liveReadingSession,
            SensingModes.UsesMouse(sensingMode) || SensingModes.UsesWebcamGaze(sensingMode)
                ? session.IsActive && (!_gazeSubscribers.IsEmpty || ShouldPublishToExternalProvider() || ShouldPublishToExternalAnalysisProvider())
                : Volatile.Read(ref _isHardwareTracking) == 1,
            _gazeSubscribers.Count);
        var externalProviderStatus = BuildExternalProviderStatusSnapshot(_providerConnectionRegistry);
        var eyeMovementAnalysisProviderStatus = BuildEyeMovementAnalysisProviderStatusSnapshot(_analysisProviderConnectionRegistry);
        var analysisObservedAtUnixMs = _eyeMovementAnalysisRuntimeState.LatestObservation?.ObservedAtUnixMs
            ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        return new ExperimentSessionSnapshot(
            session.Id,
            session.IsActive,
            session.StartedAtUnixMs,
            session.StoppedAtUnixMs,
            session.Participant?.Copy(),
            session.EyeTrackerDevice?.Copy(),
            sensingMode,
            _calibrationSnapshot,
            setup,
            Interlocked.Read(ref _receivedGazeSamples),
            latest?.Copy(),
            _clientBroadcasterAdapter.ConnectedClients,
            liveMonitoring,
            signalSources,
            _webcamStatus.Copy(),
            externalProviderStatus,
            _liveReadingSession.Copy(),
            _decisionConfiguration.Copy(),
            _decisionState.Copy(),
            eyeMovementAnalysisProviderStatus,
            _eyeMovementAnalysisConfiguration.Copy(),
            EyeMovementAnalysisProjector.ToSnapshot(_eyeMovementAnalysisRuntimeState, analysisObservedAtUnixMs));
    }


    public IReadOnlyList<ReadingInterventionModuleDescriptor> GetInterventionModules()
    {
        return _interventionModuleRegistry.List();
    }


    private Guid? GetCurrentSessionId()
    {
        return Volatile.Read(ref _session).Id;
    }

    private bool ShouldPublishToExternalProvider()
    {
        return string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.External, StringComparison.Ordinal) &&
               _providerConnectionRegistry.TryGetActiveProvider(out var provider) &&
               provider is not null;
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


    private ExperimentSetupSnapshot BuildSetupSnapshot(
        ExperimentSession session,
        CalibrationSessionSnapshot calibrationSnapshot,
        LiveReadingSessionSnapshot liveReadingSession)
    {
        const string eyeTrackerBlockReason = "Select and license an eye tracker before starting the session.";
        const string webcamBlockReason = "Connect a webcam before starting a webcam-only session.";
        const string participantBlockReason = "Save the participant information before starting the session.";
        const string calibrationBlockReason = "Calibration validation must pass before the session can start.";
        const string readingMaterialBlockReason = "Choose the reading material before starting the session.";
        var sensingMode = _sensingModeSettingsService.CurrentMode;
        var isMouseMode = SensingModes.UsesMouse(sensingMode);
        var isWebcamMode = SensingModes.UsesWebcamGaze(sensingMode);
        var usesWebcamFace = SensingModes.UsesWebcamFace(sensingMode);
        var requiresEyeTracker = SensingModes.UsesEyeTracker(sensingMode) && !isMouseMode;
        var bypassEyeTrackerAndCalibration = isMouseMode || isWebcamMode;
        var webcamReady = !usesWebcamFace || _webcamStatus.IsConnected;

        var hasSelectedEyeTracker = session.EyeTrackerDevice is not null &&
                                    !string.IsNullOrWhiteSpace(session.EyeTrackerDevice.SerialNumber);
        var requiresEyeTrackerLicence = EyeTrackerLicencePolicy.RequiresLicence(session.EyeTrackerDevice);
        var hasAppliedLicence = hasSelectedEyeTracker;
        var hasSavedLicence = requiresEyeTrackerLicence && session.EyeTrackerDevice?.HasSavedLicence == true;
        var eyeTrackerReady = !requiresEyeTracker || (_experimentSetupTestingOptions.ForceEyeTrackerReady ?? (hasSelectedEyeTracker && hasAppliedLicence));
        var eyeTracker = new EyeTrackerSetupReadinessSnapshot(
            eyeTrackerReady,
            hasSelectedEyeTracker,
            hasAppliedLicence,
            hasSavedLicence,
            requiresEyeTrackerLicence && hasSelectedEyeTracker && !hasSavedLicence,
            NormalizeNullableText(session.EyeTrackerDevice?.SerialNumber),
            NormalizeNullableText(session.EyeTrackerDevice?.Name),
            eyeTrackerReady ? null : eyeTrackerBlockReason);

        var hasParticipant = session.Participant is not null &&
                             !string.IsNullOrWhiteSpace(session.Participant.Name);
        var participantReady = _experimentSetupTestingOptions.ForceParticipantReady ?? hasParticipant;
        var participant = new ParticipantSetupReadinessSnapshot(
            participantReady,
            hasParticipant,
            NormalizeNullableText(session.Participant?.Name),
            participantReady ? null : participantBlockReason);

        var validationResult = calibrationSnapshot.Validation.Result ?? calibrationSnapshot.Result?.Validation;
        var isCalibrationApplied = CalibrationSessionSnapshots.IsApplied(calibrationSnapshot);
        var isValidationPassed = validationResult?.Passed == true;
        var hasCalibrationSession = calibrationSnapshot.SessionId.HasValue;
        var calibrationStatus = string.IsNullOrWhiteSpace(calibrationSnapshot.Status) ? "idle" : calibrationSnapshot.Status;
        var validationStatus = string.IsNullOrWhiteSpace(calibrationSnapshot.Validation.Status) ? "idle" : calibrationSnapshot.Validation.Status;
        var calibrationReady = bypassEyeTrackerAndCalibration || (_experimentSetupTestingOptions.ForceCalibrationReady ?? (isCalibrationApplied && isValidationPassed));
        var calibration = new CalibrationSetupReadinessSnapshot(
            calibrationReady,
            hasCalibrationSession,
            isCalibrationApplied,
            isValidationPassed,
            bypassEyeTrackerAndCalibration ? "skipped" : calibrationStatus,
            bypassEyeTrackerAndCalibration ? "skipped" : validationStatus,
            NormalizeNullableText(validationResult?.Quality),
            validationResult?.AverageAccuracyDegrees,
            validationResult?.AveragePrecisionDegrees,
            validationResult?.SampleCount ?? 0,
            calibrationReady ? null : calibrationBlockReason);

        var hasReadingMaterial = liveReadingSession.Content is not null &&
                                 !string.IsNullOrWhiteSpace(liveReadingSession.Content.Markdown);
        var usesSavedSetup = hasReadingMaterial && liveReadingSession.Content?.UsesSavedSetup == true;
        var allowsResearcherPresentationChanges = hasReadingMaterial && liveReadingSession.Presentation.EditableByResearcher;
        var readingMaterialReady = _experimentSetupTestingOptions.ForceReadingMaterialReady ?? hasReadingMaterial;
        var readingMaterial = new ReadingMaterialSetupReadinessSnapshot(
            readingMaterialReady,
            hasReadingMaterial,
            NormalizeNullableText(liveReadingSession.Content?.DocumentId),
            NormalizeNullableText(liveReadingSession.Content?.Title),
            NormalizeNullableText(liveReadingSession.Content?.SourceSetupId),
            usesSavedSetup,
            hasReadingMaterial ? liveReadingSession.Content?.UpdatedAtUnixMs : null,
            allowsResearcherPresentationChanges,
            hasReadingMaterial && liveReadingSession.Presentation.IsPresentationLocked,
            readingMaterialReady ? null : readingMaterialBlockReason);

        var currentStepIndex = 3;
        ExperimentSetupBlockerSnapshot? blocker = null;

        if (!eyeTracker.IsReady)
        {
            currentStepIndex = 0;
            blocker = new ExperimentSetupBlockerSnapshot("eye-tracker", "Eye tracker", eyeTracker.BlockReason ?? eyeTrackerBlockReason);
        }
        else if (isWebcamMode && !webcamReady)
        {
            currentStepIndex = 0;
            blocker = new ExperimentSetupBlockerSnapshot(
                "webcam",
                "Webcam",
                _webcamStatus.Detail ?? webcamBlockReason);
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
            liveReadingSession.LatestFacialObservation is not null || liveReadingSession.LatestFacialDifficultySignal is not null,
            liveReadingSession.LatestFacialObservation?.CapturedAtUnixMs
                ?? liveReadingSession.LatestFacialDifficultySignal?.ObservedAtUnixMs,
            participantViewport.IsConnected,
            hasParticipantViewportData,
            participantViewport.UpdatedAtUnixMs > 0 ? participantViewport.UpdatedAtUnixMs : null,
            hasReadingFocusSignal,
            focus.UpdatedAtUnixMs > 0 ? focus.UpdatedAtUnixMs : null);
    }

    private static ExternalProviderStatusSnapshot BuildExternalProviderStatusSnapshot(
        IProviderConnectionRegistry providerConnectionRegistry)
    {
        if (!providerConnectionRegistry.TryGetActiveProvider(out var provider) || provider is null)
        {
            return ExternalProviderStatusSnapshot.Disconnected.Copy();
        }

        return new ExternalProviderStatusSnapshot(
            true,
            string.IsNullOrWhiteSpace(provider.Status) ? ProviderConnectionStatuses.Active : provider.Status,
            NormalizeNullableText(provider.ProviderId),
            NormalizeNullableText(provider.DisplayName),
            provider.Capabilities.SupportsAdvisoryExecution,
            provider.Capabilities.SupportsAutonomousExecution,
            provider.Capabilities.SupportedInterventionModuleIds is null
                ? []
                : provider.Capabilities.SupportedInterventionModuleIds
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Select(id => id.Trim())
                    .Distinct(StringComparer.Ordinal)
                    .ToArray(),
            provider.LastHeartbeatAtUnixMs > 0 ? provider.LastHeartbeatAtUnixMs : null);
    }

    private static EyeMovementAnalysisProviderStatusSnapshot BuildEyeMovementAnalysisProviderStatusSnapshot(
        IAnalysisProviderConnectionRegistry providerConnectionRegistry)
    {
        if (!providerConnectionRegistry.TryGetActiveProvider(out var provider) || provider is null)
        {
            return EyeMovementAnalysisProviderStatusSnapshot.Disconnected.Copy();
        }

        return new EyeMovementAnalysisProviderStatusSnapshot(
            true,
            string.IsNullOrWhiteSpace(provider.Status) ? "active" : provider.Status,
            NormalizeNullableText(provider.ProviderId),
            NormalizeNullableText(provider.DisplayName),
            provider.LastHeartbeatAtUnixMs > 0 ? provider.LastHeartbeatAtUnixMs : null);
    }

    private static SensingSignalSourcesSnapshot BuildSignalSourcesSnapshot(string sensingMode)
    {
        if (SensingModes.UsesWebcamGaze(sensingMode))
        {
            return new SensingSignalSourcesSnapshot(SensingSignalSources.Webcam, SensingSignalSources.Webcam);
        }

        if (SensingModes.UsesMouse(sensingMode))
        {
            return new SensingSignalSourcesSnapshot(SensingSignalSources.Mouse, SensingSignalSources.None);
        }

        if (SensingModes.UsesWebcamFace(sensingMode))
        {
            return new SensingSignalSourcesSnapshot(SensingSignalSources.Tobii, SensingSignalSources.Webcam);
        }

        return new SensingSignalSourcesSnapshot(SensingSignalSources.Tobii, SensingSignalSources.None);
    }


}
