using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public sealed class InterventionsOutboundPublisher : IExternalProviderGateway
{
    private readonly IModuleProviderGateway _gateway;

    public InterventionsOutboundPublisher(IModuleProviderGateway gateway)
    {
        _gateway = gateway;
    }

    public async ValueTask PublishDecisionContextAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.DecisionContext,
            context,
            new ModuleProviderPublishContext(context.SessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.SessionSnapshot,
            snapshot,
            new ModuleProviderPublishContext(snapshot.SessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.GazeSample,
            gazeData,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishReadingFocusChangedAsync(Guid? sessionId, ReadingFocusSnapshot focus, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.ReadingFocusChanged,
            focus,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.ViewportChanged,
            viewport,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishAttentionSummaryChangedAsync(Guid? sessionId, ReadingAttentionSummarySnapshot summary, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.AttentionSummaryChanged,
            summary,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishInterventionEventAsync(Guid? sessionId, InterventionEventSnapshot interventionEvent, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.InterventionEvent,
            interventionEvent,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }

    public async ValueTask PublishDecisionUpdateAsync(Guid? sessionId, DecisionRealtimeUpdateSnapshot update, CancellationToken ct = default)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.DecisionModeChanged,
            update,
            new ModuleProviderPublishContext(sessionId?.ToString("D")),
            ct);
    }
}
