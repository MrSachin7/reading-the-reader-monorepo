using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
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

public sealed class AnalysisProviderGateway : IAnalysisProviderGateway
{
    private readonly IAnalysisProviderConnectionRegistry _providerConnectionRegistry;
    private readonly IExternalAnalysisProviderTransportAdapter _transportAdapter;

    public AnalysisProviderGateway(
        IAnalysisProviderConnectionRegistry providerConnectionRegistry,
        IExternalAnalysisProviderTransportAdapter transportAdapter)
    {
        _providerConnectionRegistry = providerConnectionRegistry;
        _transportAdapter = transportAdapter;
    }

    public ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
        => PublishAsync(AnalysisProviderMessageTypes.AnalysisProviderSessionSnapshot, snapshot, snapshot.SessionId, ct);

    public ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default)
        => PublishAsync(AnalysisProviderMessageTypes.AnalysisProviderGazeSample, gazeData, sessionId, ct);

    public ValueTask PublishReadingObservationAsync(Guid? sessionId, ReadingGazeObservationSnapshot observation, CancellationToken ct = default)
        => PublishAsync(AnalysisProviderMessageTypes.AnalysisProviderReadingObservation, observation, sessionId, ct);

    public ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default)
        => PublishAsync(AnalysisProviderMessageTypes.AnalysisProviderViewportChanged, viewport, sessionId, ct);

    public ValueTask PublishStateChangedAsync(Guid? sessionId, EyeMovementAnalysisSnapshot analysis, CancellationToken ct = default)
        => PublishAsync(AnalysisProviderMessageTypes.AnalysisProviderStateChanged, analysis, sessionId, ct);

    private async ValueTask PublishAsync<TPayload>(
        string messageType,
        TPayload payload,
        Guid? sessionId,
        CancellationToken ct)
    {
        if (!_providerConnectionRegistry.TryGetActiveProvider(out var provider) || provider is null)
        {
            return;
        }

        await _transportAdapter.SendToProviderAsync(
            provider.ConnectionId,
            messageType,
            payload,
            provider.ProviderId,
            sessionId?.ToString("D"),
            null,
            ct);
    }
}
