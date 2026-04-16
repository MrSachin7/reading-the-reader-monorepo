using System.Collections.Concurrent;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class RealtimeTestDoubles
{
    public static RuntimeHarness CreateHarness(
        CalibrationOptions? calibrationOptions = null,
        ExperimentSetupTestingOptions? experimentSetupTestingOptions = null)
    {
        return CreateHarness(
            new FakeEyeTrackerAdapter(),
            new FakeClientBroadcasterAdapter(),
            new FakeExperimentStateStoreAdapter(),
            new FakeExperimentReplayExportStoreAdapter(),
            calibrationOptions,
            experimentSetupTestingOptions);
    }

    public static RuntimeHarness CreateHarness(
        FakeEyeTrackerAdapter eyeTrackerAdapter,
        FakeClientBroadcasterAdapter broadcaster,
        FakeExperimentStateStoreAdapter stateStore,
        FakeExperimentReplayExportStoreAdapter replayExportStore,
        CalibrationOptions? calibrationOptions = null,
        ExperimentSetupTestingOptions? experimentSetupTestingOptions = null)
    {
        var replayRecoveryStore = new FakeExperimentReplayRecoveryStoreAdapter();
        calibrationOptions ??= new CalibrationOptions();
        experimentSetupTestingOptions ??= new ExperimentSetupTestingOptions();
        var interventionModuleRegistry = new ReadingInterventionModuleRegistry(BuiltInReadingInterventionModules.All);
        var interventionRuntime = new FakeReadingInterventionRuntime();
        var externalProviderOptions = new ExternalProviderOptions
        {
            SharedSecret = "test-provider-secret",
            HeartbeatTimeoutMilliseconds = 12_000
        };
        var providerRegistry = new ProviderConnectionRegistry(externalProviderOptions);
        var externalProviderTransport = new FakeExternalProviderTransportAdapter();
        var externalProviderGateway = new ExternalProviderGateway(providerRegistry, externalProviderTransport);
        var externalAnalysisProviderOptions = new ExternalAnalysisProviderOptions
        {
            SharedSecret = "test-analysis-provider-secret",
            HeartbeatTimeoutMilliseconds = 12_000
        };
        var analysisProviderRegistry = new AnalysisProviderConnectionRegistry(externalAnalysisProviderOptions);
        var externalAnalysisProviderTransport = new FakeExternalAnalysisProviderTransportAdapter();
        var analysisProviderGateway = new AnalysisProviderGateway(analysisProviderRegistry, externalAnalysisProviderTransport);
        var analysisStrategyRegistry = new EyeMovementAnalysisStrategyRegistry(
            [
                new BuiltInEyeMovementAnalysisStrategy(),
                new ExternalEyeMovementAnalysisStrategy(analysisProviderGateway)
            ]);
        var analysisStrategyCoordinator = new EyeMovementAnalysisStrategyCoordinator(analysisStrategyRegistry);
        var decisionContextFactory = new DecisionContextFactory();
        var strategyRegistry = new DecisionStrategyRegistry(
            [
                new RuleBasedDecisionStrategy(),
                new ExternalDecisionStrategy(externalProviderGateway)
            ]);
        var strategyCoordinator = new DecisionStrategyCoordinator(strategyRegistry, decisionContextFactory);

        var sessionManager = new ExperimentSessionManager(
            eyeTrackerAdapter,
            broadcaster,
            stateStore,
            replayExportStore,
            replayRecoveryStore,
            calibrationOptions,
            experimentSetupTestingOptions,
            interventionRuntime,
            interventionModuleRegistry,
            analysisStrategyCoordinator,
            strategyCoordinator,
            analysisProviderGateway,
            externalProviderGateway,
            analysisProviderRegistry,
            providerRegistry);
        var readerObservationService = new ReaderObservationService(sessionManager);
        var ingress = new ExperimentCommandIngress(
            sessionManager,
            readerObservationService,
            broadcaster);
        var providerIngress = new ProviderIngressService(
            providerRegistry,
            sessionManager,
            sessionManager,
            broadcaster,
            externalProviderOptions);

        return new RuntimeHarness(
            sessionManager,
            ingress,
            providerIngress,
            eyeTrackerAdapter,
            broadcaster,
            stateStore,
            replayExportStore,
            replayRecoveryStore,
            interventionRuntime,
            providerRegistry,
            externalProviderTransport,
            externalProviderOptions);
    }

    public sealed record RuntimeHarness(
        ExperimentSessionManager SessionManager,
        ExperimentCommandIngress Ingress,
        ProviderIngressService ProviderIngress,
        FakeEyeTrackerAdapter EyeTrackerAdapter,
        FakeClientBroadcasterAdapter Broadcaster,
        FakeExperimentStateStoreAdapter StateStore,
        FakeExperimentReplayExportStoreAdapter ReplayExportStore,
        FakeExperimentReplayRecoveryStoreAdapter ReplayRecoveryStore,
        FakeReadingInterventionRuntime InterventionRuntime,
        ProviderConnectionRegistry ProviderRegistry,
        FakeExternalProviderTransportAdapter ExternalProviderTransport,
        ExternalProviderOptions ExternalProviderOptions);

    public sealed record BroadcastMessage(string MessageType, object? Payload);

    public sealed record DirectMessage(string ConnectionId, string MessageType, object? Payload);

    public sealed record ProviderTransportMessage(
        string ConnectionId,
        string MessageType,
        object? Payload,
        string? ProviderId,
        string? SessionId,
        string? CorrelationId);

    public sealed class FakeClientBroadcasterAdapter : IClientBroadcasterAdapter
    {
        private readonly ConcurrentQueue<BroadcastMessage> _broadcasts = new();
        private readonly ConcurrentQueue<DirectMessage> _directMessages = new();

        public IReadOnlyCollection<BroadcastMessage> Broadcasts => _broadcasts.ToArray();

        public IReadOnlyCollection<DirectMessage> DirectMessages => _directMessages.ToArray();

        public int ConnectedClients { get; set; }

        public ValueTask BroadcastAsync<T>(string messageType, T payload, CancellationToken ct = default)
        {
            _broadcasts.Enqueue(new BroadcastMessage(messageType, payload));
            return ValueTask.CompletedTask;
        }

        public ValueTask SendToClientAsync<T>(string connectionId, string messageType, T payload, CancellationToken ct = default)
        {
            _directMessages.Enqueue(new DirectMessage(connectionId, messageType, payload));
            return ValueTask.CompletedTask;
        }
    }

    public sealed class FakeExternalProviderTransportAdapter : IExternalProviderTransportAdapter
    {
        private readonly ConcurrentQueue<ProviderTransportMessage> _messages = new();

        public IReadOnlyCollection<ProviderTransportMessage> Messages => _messages.ToArray();

        public ValueTask SendToProviderAsync<TPayload>(
            string connectionId,
            string messageType,
            TPayload payload,
            string? providerId = null,
            string? sessionId = null,
            string? correlationId = null,
            CancellationToken ct = default)
        {
            _messages.Enqueue(new ProviderTransportMessage(
                connectionId,
                messageType,
                payload,
                providerId,
                sessionId,
                correlationId));
            return ValueTask.CompletedTask;
        }
    }

    public sealed class FakeExternalAnalysisProviderTransportAdapter : IExternalAnalysisProviderTransportAdapter
    {
        private readonly ConcurrentQueue<ProviderTransportMessage> _messages = new();

        public IReadOnlyCollection<ProviderTransportMessage> Messages => _messages.ToArray();

        public ValueTask SendToProviderAsync<TPayload>(
            string connectionId,
            string messageType,
            TPayload payload,
            string? providerId = null,
            string? sessionId = null,
            string? correlationId = null,
            CancellationToken ct = default)
        {
            _messages.Enqueue(new ProviderTransportMessage(
                connectionId,
                messageType,
                payload,
                providerId,
                sessionId,
                correlationId));
            return ValueTask.CompletedTask;
        }
    }

    public sealed class FakeExperimentStateStoreAdapter : IExperimentStateStoreAdapter
    {
        private readonly List<ExperimentReplayExport> _savedActiveReplays = [];
        private ExperimentReplayExport? _latestActiveReplay;

        public IReadOnlyList<ExperimentReplayExport> SavedActiveReplays => _savedActiveReplays;

        public ExperimentReplayExport? LatestActiveReplay => _latestActiveReplay?.Copy();

        public ValueTask SaveActiveReplayAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
        {
            _savedActiveReplays.Add(exportDocument.Copy());
            _latestActiveReplay = exportDocument.Copy();
            return ValueTask.CompletedTask;
        }

        public ValueTask<ExperimentReplayExport?> LoadActiveReplayAsync(CancellationToken ct = default)
        {
            return ValueTask.FromResult(LatestActiveReplay);
        }

        public ValueTask ClearActiveReplayAsync(CancellationToken ct = default)
        {
            _latestActiveReplay = null;
            return ValueTask.CompletedTask;
        }
    }

    public sealed class FakeExperimentReplayExportStoreAdapter : IExperimentReplayExportStoreAdapter
    {
        private readonly List<SavedExperimentReplayExportSummary> _saved = [];
        private readonly Dictionary<string, ExperimentReplayExport> _savedById = new(StringComparer.Ordinal);

        public ExperimentReplayExport? LatestExport { get; private set; }

        public IReadOnlyCollection<SavedExperimentReplayExportSummary> Saved => _saved.AsReadOnly();

        public ValueTask SaveLatestAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
        {
            LatestExport = exportDocument.Copy();
            return ValueTask.CompletedTask;
        }

        public ValueTask<ExperimentReplayExport?> LoadLatestAsync(CancellationToken ct = default)
        {
            return ValueTask.FromResult(LatestExport?.Copy());
        }

        public ValueTask<SavedExperimentReplayExportSummary> SaveNamedAsync(
            string name,
            string format,
            ExperimentReplayExport exportDocument,
            CancellationToken ct = default)
        {
            var id = $"{name}-{format}".Replace(' ', '-');
            var timestamp = exportDocument.Manifest.ExportedAtUnixMs;
            var summary = new SavedExperimentReplayExportSummary(
                id,
                name,
                $"{id}.{format}",
                format,
                exportDocument.Experiment.SessionId,
                timestamp,
                timestamp,
                timestamp);

            _saved.Add(summary);
            _savedById[id] = exportDocument.Copy();
            return ValueTask.FromResult(summary);
        }

        public ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedAsync(CancellationToken ct = default)
        {
            return ValueTask.FromResult<IReadOnlyCollection<SavedExperimentReplayExportSummary>>(_saved.ToArray());
        }

        public ValueTask<ExperimentReplayExport?> LoadSavedByIdAsync(string id, CancellationToken ct = default)
        {
            return ValueTask.FromResult(_savedById.TryGetValue(id, out var exportDocument)
                ? exportDocument.Copy()
                : null);
        }
    }

    public sealed class FakeExperimentReplayRecoveryStoreAdapter : IExperimentReplayRecoveryStoreAdapter
    {
        private readonly Dictionary<Guid, RecoveryState> _sessions = [];

        public ValueTask InitializeSessionAsync(ExperimentReplayRecoverySessionSeed seed, CancellationToken ct = default)
        {
            _sessions[seed.SessionId] = new RecoveryState(
                seed.SessionId,
                BuildName(seed.InitialSnapshot, seed.SessionId),
                ExperimentReplayRecoveryStatuses.Recording,
                seed.CreatedAtUnixMs,
                seed.CreatedAtUnixMs,
                seed.InitialSnapshot.Copy(),
                seed.InitialSnapshot.Copy(),
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                []);
            return ValueTask.CompletedTask;
        }

        public ValueTask AppendChunkAsync(ExperimentReplayRecoveryChunkBatch batch, CancellationToken ct = default)
        {
            if (!_sessions.TryGetValue(batch.SessionId, out var session))
            {
                return ValueTask.CompletedTask;
            }

            _sessions[batch.SessionId] = session with
            {
                UpdatedAtUnixMs = batch.FlushedAtUnixMs,
                LatestSnapshot = batch.LatestSnapshot.Copy(),
                LifecycleEvents = [.. session.LifecycleEvents, .. batch.LifecycleEvents.Select(item => item.Copy())],
                GazeSamples = [.. session.GazeSamples, .. batch.GazeSamples.Select(item => item.Copy())],
                ViewportEvents = [.. session.ViewportEvents, .. batch.ViewportEvents.Select(item => item.Copy())],
                FocusEvents = [.. session.FocusEvents, .. batch.FocusEvents.Select(item => item.Copy())],
                AttentionEvents = [.. session.AttentionEvents, .. batch.AttentionEvents.Select(item => item.Copy())],
                ContextPreservationEvents = [.. session.ContextPreservationEvents, .. (batch.ContextPreservationEvents ?? []).Select(item => item.Copy())],
                DecisionProposalEvents = [.. session.DecisionProposalEvents, .. (batch.DecisionProposalEvents ?? []).Select(item => item.Copy())],
                ScheduledInterventionEvents = [.. session.ScheduledInterventionEvents, .. (batch.ScheduledInterventionEvents ?? []).Select(item => item.Copy())],
                InterventionEvents = [.. session.InterventionEvents, .. (batch.InterventionEvents ?? []).Select(item => item.Copy())]
            };

            return ValueTask.CompletedTask;
        }

        public ValueTask<ExperimentReplayExport?> BuildExportAsync(
            Guid sessionId,
            string completionSource,
            long exportedAtUnixMs,
            CancellationToken ct = default)
        {
            if (!_sessions.TryGetValue(sessionId, out var session))
            {
                return ValueTask.FromResult<ExperimentReplayExport?>(null);
            }

            return ValueTask.FromResult<ExperimentReplayExport?>(ExperimentReplayExportFactory.Create(
                session.InitialSnapshot,
                session.LatestSnapshot,
                completionSource,
                exportedAtUnixMs,
                session.LifecycleEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.GazeSamples.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ViewportEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.FocusEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.AttentionEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ContextPreservationEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.DecisionProposalEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ScheduledInterventionEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.InterventionEvents.OrderBy(item => item.SequenceNumber).ToArray()));
        }

        public ValueTask MarkCompletedAsync(
            Guid sessionId,
            ExperimentReplayExport completedExport,
            long completedAtUnixMs,
            CancellationToken ct = default)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                _sessions[sessionId] = session with
                {
                    Status = ExperimentReplayRecoveryStatuses.Completed,
                    UpdatedAtUnixMs = completedAtUnixMs,
                    LatestSnapshot = session.LatestSnapshot with
                    {
                        IsActive = false,
                        StoppedAtUnixMs = session.LatestSnapshot.StoppedAtUnixMs ?? completedAtUnixMs
                    }
                };
            }

            return ValueTask.CompletedTask;
        }

        public void MarkRecovered(Guid sessionId)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                _sessions[sessionId] = session with
                {
                    Status = ExperimentReplayRecoveryStatuses.RecoveredIncomplete,
                    LatestSnapshot = session.LatestSnapshot with
                    {
                        IsActive = false,
                        StoppedAtUnixMs = session.LatestSnapshot.StoppedAtUnixMs ?? session.UpdatedAtUnixMs
                    }
                };
            }
        }

        private static string BuildName(ExperimentSessionSnapshot snapshot, Guid sessionId)
        {
            return snapshot.ReadingSession?.Content?.Title?.Trim() switch
            {
                { Length: > 0 } title => title,
                _ => snapshot.Participant?.Name?.Trim() switch
                {
                    { Length: > 0 } participantName => participantName,
                    _ => $"Recovered session {sessionId:N}"
                }
            };
        }

        private sealed record RecoveryState(
            Guid Id,
            string Name,
            string Status,
            long CreatedAtUnixMs,
            long UpdatedAtUnixMs,
            ExperimentSessionSnapshot InitialSnapshot,
            ExperimentSessionSnapshot LatestSnapshot,
            IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents,
            IReadOnlyList<RawGazeSampleRecord> GazeSamples,
        IReadOnlyList<ParticipantViewportEventRecord> ViewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> FocusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> AttentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> ContextPreservationEvents,
        IReadOnlyList<DecisionProposalEventRecord> DecisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> ScheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> InterventionEvents);
    }

    public sealed class FakeEyeTrackerAdapter : IEyeTrackerAdapter
    {
        private readonly List<EyeTrackerDevice> _connectedEyeTrackers = [];

        public event EventHandler<GazeData>? GazeDataReceived;

        public IReadOnlyList<EyeTrackerDevice> ConnectedEyeTrackers => _connectedEyeTrackers;

        public int StartCalls { get; private set; }

        public int StopCalls { get; private set; }

        public string? SelectedSerialNumber { get; private set; }

        public byte[]? SelectedLicenceBytes { get; private set; }

        public CalibrationCollectionResult CalibrationCollectionResult { get; set; } = new("Success", true, 1, []);

        public CalibrationComputeResult CalibrationComputeResult { get; set; } = new("Success", true, 9, [], []);

        public CalibrationValidationCollectionResult ValidationCollectionResult { get; set; } = new("Success", true, 5, []);

        public CalibrationValidationResult ValidationResult { get; set; } = new(
            true,
            "good",
            0.5,
            0.2,
            5,
            [],
            []);

        public void SeedConnectedEyeTrackers(params EyeTrackerDevice[] devices)
        {
            _connectedEyeTrackers.Clear();
            _connectedEyeTrackers.AddRange(devices.Select(device => device.Copy()));
        }

        public Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackers()
        {
            return Task.FromResult(_connectedEyeTrackers.Select(device => device.Copy()).ToList());
        }

        public Task SelectEyeTracker(string serialNumber, byte[]? licenseFileBytes, CancellationToken ct = default)
        {
            SelectedSerialNumber = serialNumber;
            SelectedLicenceBytes = licenseFileBytes?.ToArray();
            return Task.CompletedTask;
        }

        public Task StartEyeTracking()
        {
            StartCalls++;
            return Task.CompletedTask;
        }

        public void StopEyeTracking()
        {
            StopCalls++;
        }

        public Task BeginCalibrationAsync(CancellationToken ct = default) => Task.CompletedTask;

        public Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
        {
            return Task.FromResult(CalibrationCollectionResult);
        }

        public Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default)
        {
            return Task.FromResult(CalibrationComputeResult);
        }

        public Task BeginValidationAsync(CancellationToken ct = default) => Task.CompletedTask;

        public Task<CalibrationValidationCollectionResult> CollectValidationDataAsync(float x, float y, CancellationToken ct = default)
        {
            return Task.FromResult(ValidationCollectionResult);
        }

        public Task<CalibrationValidationResult> ComputeValidationAsync(CancellationToken ct = default)
        {
            return Task.FromResult(ValidationResult);
        }

        public Task CancelCalibrationAsync(CancellationToken ct = default) => Task.CompletedTask;

        public Task CancelValidationAsync(CancellationToken ct = default) => Task.CompletedTask;

        public void EmitGazeSample(GazeData gazeData)
        {
            GazeDataReceived?.Invoke(this, gazeData.Copy());
        }
    }

    public sealed class FakeReadingInterventionRuntime : IReadingInterventionRuntime
    {
        public Func<ReadingPresentationSnapshot, ReaderAppearanceSnapshot, ApplyInterventionCommand, long, InterventionExecutionResult?>? ApplyOverride { get; set; }
        private readonly ReadingInterventionRuntime _runtime =
            new(new ReadingInterventionModuleRegistry(BuiltInReadingInterventionModules.All));

        public InterventionExecutionResult? Apply(
            ReadingPresentationSnapshot currentPresentation,
            ReaderAppearanceSnapshot currentAppearance,
            ApplyInterventionCommand command,
            long appliedAtUnixMs)
        {
            if (ApplyOverride is not null)
            {
                return ApplyOverride(currentPresentation, currentAppearance, command, appliedAtUnixMs);
            }

            return _runtime.Apply(currentPresentation, currentAppearance, command, appliedAtUnixMs);
        }
    }

    public static class TestRuntimeSetup
    {
        public static CalibrationSessionSnapshot CreateCompletedCalibrationSnapshot()
        {
            return new CalibrationSessionSnapshot(
                Guid.NewGuid(),
                "completed",
                CalibrationPatterns.ScreenBasedNinePoint,
                1_710_000_000_000,
                1_710_000_001_000,
                1_710_000_002_000,
                [],
                new CalibrationRunResult(
                    "applied",
                    true,
                    9,
                    [],
                    new CalibrationValidationResult(
                        true,
                        "good",
                        0.5,
                        0.2,
                        9,
                        [],
                        []),
                    []),
                new CalibrationValidationSnapshot(
                    "completed",
                    1_710_000_001_000,
                    1_710_000_001_500,
                    1_710_000_002_000,
                    [],
                    new CalibrationValidationResult(
                        true,
                        "good",
                        0.5,
                        0.2,
                        9,
                        [],
                        []),
                    []),
                []);
        }

        public static async Task ConfigureReadySessionAsync(RuntimeHarness harness)
        {
            await harness.SessionManager.SetCurrentParticipantAsync(new Participant
            {
                Name = "Participant 1",
                Age = 29,
                Sex = "female",
                ExistingEyeCondition = "none",
                ReadingProficiency = "advanced"
            });

            await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
            {
                Name = "Tobii Pro Nano",
                Model = "Nano",
                SerialNumber = "nano-001",
                HasSavedLicence = true
            });

            await harness.SessionManager.SetCalibrationStateAsync(CreateCompletedCalibrationSnapshot());

            await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
                "doc-1",
                "Sample document",
                "# Hello reader",
                null,
                ReadingPresentationSnapshot.Default,
                ReaderAppearanceSnapshot.Default));
        }
    }
}
