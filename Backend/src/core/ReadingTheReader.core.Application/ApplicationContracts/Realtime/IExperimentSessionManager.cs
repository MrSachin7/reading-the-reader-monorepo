using System.Text.Json;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IExperimentSessionManager
{
    ValueTask SetCurrentParticipantAsync(Participant participant, CancellationToken ct = default);
    
    ValueTask SetCurrentEyeTrackerAsync(EyeTrackerDevice eyeTrackerDevice, CancellationToken ct = default);

    ValueTask SetCalibrationStateAsync(CalibrationSessionSnapshot calibrationSnapshot, CancellationToken ct = default);

    ValueTask SetReadingSessionAsync(UpsertReadingSessionCommand command, CancellationToken ct = default);

    ValueTask<LiveReadingSessionSnapshot> RegisterParticipantViewAsync(string connectionId, CancellationToken ct = default);

    ValueTask<ParticipantViewportSnapshot> UpdateParticipantViewportAsync(string connectionId, UpdateParticipantViewportCommand command, CancellationToken ct = default);

    ValueTask<ReadingFocusSnapshot> UpdateReadingFocusAsync(UpdateReadingFocusCommand command, CancellationToken ct = default);

    ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(UpdateReadingAttentionSummaryCommand command, CancellationToken ct = default);

    ValueTask<InterventionEventSnapshot?> ApplyInterventionAsync(ApplyInterventionCommand command, CancellationToken ct = default);

    ValueTask PauseGazeStreamingAsync(CancellationToken ct = default);

    ValueTask ResumeGazeStreamingAsync(CancellationToken ct = default);

    Task<bool> StartSessionAsync(CancellationToken ct = default);

    Task<bool> StopSessionAsync(CancellationToken ct = default);

    Task<ExperimentSessionSnapshot> FinishSessionAsync(FinishExperimentCommand command, CancellationToken ct = default);

    void UpdateGazeSample(GazeData gazeData);

    ValueTask<ExperimentReplayExport?> GetLatestReplayExportAsync(CancellationToken ct = default);

    ValueTask<SavedExperimentReplayExportSummary> SaveLatestReplayExportAsync(
        SaveExperimentReplayExportCommand command,
        CancellationToken ct = default);

    ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedReplayExportsAsync(CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> GetSavedReplayExportByIdAsync(string id, CancellationToken ct = default);

    ExperimentSessionSnapshot GetCurrentSnapshot();

    Task HandleInboundMessageAsync(string connectionId, string messageType, JsonElement payload, CancellationToken ct = default);

    Task HandleClientDisconnectedAsync(string connectionId, CancellationToken ct = default);
}
