using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

public sealed class ReaderObservationService : IReaderObservationService
{
    private readonly ExperimentSessionManager _sessionManager;

    public ReaderObservationService(ExperimentSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    public ValueTask<LiveReadingSessionSnapshot> RegisterParticipantViewAsync(string connectionId, CancellationToken ct = default)
        => _sessionManager.RegisterParticipantViewAsync(connectionId, ct);

    public ValueTask DisconnectParticipantViewAsync(string connectionId, CancellationToken ct = default)
        => _sessionManager.DisconnectParticipantViewAsync(connectionId, ct);

    public ValueTask<ParticipantViewportSnapshot> UpdateParticipantViewportAsync(
        string connectionId,
        UpdateParticipantViewportCommand command,
        CancellationToken ct = default)
        => _sessionManager.UpdateParticipantViewportAsync(connectionId, command, ct);

    public ValueTask<ReadingFocusSnapshot> UpdateReadingFocusAsync(
        UpdateReadingFocusCommand command,
        CancellationToken ct = default)
        => _sessionManager.UpdateReadingFocusAsync(command, ct);

    public ValueTask<EyeMovementAnalysisSnapshot> UpdateReadingGazeObservationAsync(
        ReadingGazeObservationCommand command,
        CancellationToken ct = default)
        => _sessionManager.UpdateReadingGazeObservationAsync(command, ct);

    public ValueTask<ReadingContextPreservationEventSnapshot> UpdateReadingContextPreservationAsync(
        UpdateReadingContextPreservationCommand command,
        CancellationToken ct = default)
        => _sessionManager.UpdateReadingContextPreservationAsync(command, ct);

    public ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(
        UpdateReadingAttentionSummaryCommand command,
        CancellationToken ct = default)
        => _sessionManager.UpdateReadingAttentionSummaryAsync(command, ct);
}
