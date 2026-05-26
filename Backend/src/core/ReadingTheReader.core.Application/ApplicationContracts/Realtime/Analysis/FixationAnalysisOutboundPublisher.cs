using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class FixationAnalysisOutboundPublisher : IAnalysisProviderGateway
{
    private readonly IModuleProviderGateway _gateway;

    public FixationAnalysisOutboundPublisher(IModuleProviderGateway gateway)
    {
        _gateway = gateway;
    }

    public async ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.SessionSnapshot,
            snapshot,
            new ModuleProviderPublishContext(snapshot.SessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.GazeSample,
            gazeData,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishReadingObservationAsync(Guid? sessionId, ReadingGazeObservationSnapshot observation, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.ReadingObservation,
            observation,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.ViewportChanged,
            viewport,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishStateChangedAsync(Guid? sessionId, EyeMovementAnalysisSnapshot analysis, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.StateChanged,
            analysis,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }
}
