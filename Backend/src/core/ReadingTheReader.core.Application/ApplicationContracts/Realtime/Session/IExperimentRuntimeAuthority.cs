using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IExperimentRuntimeAuthority
{
    ValueTask SetCurrentEyeTrackerAsync(EyeTrackerDevice eyeTrackerDevice, CancellationToken ct = default);

    ValueTask SetCalibrationStateAsync(CalibrationSessionSnapshot calibrationSnapshot, CancellationToken ct = default);

    ValueTask SetReadingSessionAsync(UpsertReadingSessionCommand command, CancellationToken ct = default);

    ValueTask<InterventionEventSnapshot?> ApplyInterventionAsync(ApplyInterventionCommand command, CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> UpdateDecisionConfigurationAsync(
        DecisionConfigurationSnapshot configuration,
        bool automationPaused,
        CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> ApproveDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> RejectDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionAutomationPausedAsync(
        bool automationPaused,
        CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionExecutionModeAsync(
        string executionMode,
        CancellationToken ct = default);

    ValueTask<DecisionRealtimeUpdateSnapshot> EvaluateDecisionStrategiesAsync(CancellationToken ct = default);

    ValueTask<SavedExperimentReplayExportSummary> SaveLatestReplayExportAsync(
        SaveExperimentReplayExportCommand command,
        CancellationToken ct = default);

    Task<bool> StartSessionAsync(CancellationToken ct = default);

    Task<bool> StopSessionAsync(CancellationToken ct = default);

    Task<ExperimentSessionSnapshot> FinishSessionAsync(FinishExperimentCommand command, CancellationToken ct = default);

    ValueTask SubscribeGazeDataAsync(string connectionId, CancellationToken ct = default);

    ValueTask UnsubscribeGazeDataAsync(string connectionId, CancellationToken ct = default);

    ValueTask PauseGazeStreamingAsync(CancellationToken ct = default);

    ValueTask ResumeGazeStreamingAsync(CancellationToken ct = default);

    ExperimentSessionSnapshot GetCurrentSnapshot();
}
