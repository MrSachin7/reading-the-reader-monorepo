using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

public interface IReaderObservationService
{
    ValueTask<LiveReadingSessionSnapshot> RegisterParticipantViewAsync(string connectionId, CancellationToken ct = default);

    ValueTask DisconnectParticipantViewAsync(string connectionId, CancellationToken ct = default);

    ValueTask<ParticipantViewportSnapshot> UpdateParticipantViewportAsync(
        string connectionId,
        UpdateParticipantViewportCommand command,
        CancellationToken ct = default);

    ValueTask<ReadingFocusSnapshot> UpdateReadingFocusAsync(
        UpdateReadingFocusCommand command,
        CancellationToken ct = default);

    ValueTask<ReadingFocusSnapshot> UpdateEnrichedGazeSampleAsync(
        UpdateEnrichedGazeSampleCommand command,
        CancellationToken ct = default);

    ValueTask<EyeMovementAnalysisSnapshot> UpdateReadingGazeObservationAsync(
        ReadingGazeObservationCommand command,
        CancellationToken ct = default);

    ValueTask<ReadingContextPreservationEventSnapshot> UpdateReadingContextPreservationAsync(
        UpdateReadingContextPreservationCommand command,
        CancellationToken ct = default);

    ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(
        UpdateReadingAttentionSummaryCommand command,
        CancellationToken ct = default);
}
