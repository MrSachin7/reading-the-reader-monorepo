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
    private readonly IModuleProviderRttTracker _rttTracker;

    public InterventionsOutboundPublisher(IModuleProviderGateway gateway, IModuleProviderRttTracker rttTracker)
    {
        _gateway = gateway;
        _rttTracker = rttTracker;
    }

    public async ValueTask PublishDecisionContextAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        // Stamp a backend-issued correlation id and record the send time so that the
        // decision provider's echoed reply yields a single-clock round-trip latency:
        // the cost of delegating the decision out-of-process (evaluation RQ2).
        var correlationId = Guid.NewGuid().ToString("D");
        _rttTracker.MarkSent(correlationId, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.DecisionContext,
            context,
            new ModuleProviderPublishContext(context.SessionId?.ToString("D"), correlationId),
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
