using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public interface IAnalysisProviderGateway
{
    ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default);

    ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default);

    ValueTask PublishReadingObservationAsync(Guid? sessionId, ReadingGazeObservationSnapshot observation, CancellationToken ct = default);

    ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default);

    ValueTask PublishStateChangedAsync(Guid? sessionId, EyeMovementAnalysisSnapshot analysis, CancellationToken ct = default);
}
