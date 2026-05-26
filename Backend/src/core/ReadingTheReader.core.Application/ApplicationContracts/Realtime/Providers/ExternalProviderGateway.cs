using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

public interface IExternalProviderGateway
{
    ValueTask PublishDecisionContextAsync(DecisionContextSnapshot context, CancellationToken ct = default);

    ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default);

    ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default);

    ValueTask PublishReadingFocusChangedAsync(Guid? sessionId, ReadingFocusSnapshot focus, CancellationToken ct = default);

    ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default);

    ValueTask PublishAttentionSummaryChangedAsync(Guid? sessionId, ReadingAttentionSummarySnapshot summary, CancellationToken ct = default);

    ValueTask PublishInterventionEventAsync(Guid? sessionId, InterventionEventSnapshot interventionEvent, CancellationToken ct = default);

    ValueTask PublishDecisionUpdateAsync(Guid? sessionId, DecisionRealtimeUpdateSnapshot update, CancellationToken ct = default);
}
