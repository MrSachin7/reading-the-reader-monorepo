using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
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

public sealed class ExternalProviderGateway : IExternalProviderGateway
{
    private readonly IProviderConnectionRegistry _providerConnectionRegistry;
    private readonly IExternalProviderTransportAdapter _transportAdapter;

    public ExternalProviderGateway(
        IProviderConnectionRegistry providerConnectionRegistry,
        IExternalProviderTransportAdapter transportAdapter)
    {
        _providerConnectionRegistry = providerConnectionRegistry;
        _transportAdapter = transportAdapter;
    }

    public ValueTask PublishDecisionContextAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderDecisionContext,
            context,
            context.SessionId,
            ct);
    }

    public ValueTask PublishSessionSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderSessionSnapshot,
            snapshot,
            snapshot.SessionId,
            ct);
    }

    public ValueTask PublishGazeSampleAsync(Guid? sessionId, GazeData gazeData, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderGazeSample,
            gazeData,
            sessionId,
            ct);
    }

    public ValueTask PublishReadingFocusChangedAsync(Guid? sessionId, ReadingFocusSnapshot focus, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderReadingFocusChanged,
            focus,
            sessionId,
            ct);
    }

    public ValueTask PublishViewportChangedAsync(Guid? sessionId, ParticipantViewportSnapshot viewport, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderViewportChanged,
            viewport,
            sessionId,
            ct);
    }

    public ValueTask PublishAttentionSummaryChangedAsync(Guid? sessionId, ReadingAttentionSummarySnapshot summary, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderAttentionSummaryChanged,
            summary,
            sessionId,
            ct);
    }

    public ValueTask PublishInterventionEventAsync(Guid? sessionId, InterventionEventSnapshot interventionEvent, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderInterventionEvent,
            interventionEvent,
            sessionId,
            ct);
    }

    public ValueTask PublishDecisionUpdateAsync(Guid? sessionId, DecisionRealtimeUpdateSnapshot update, CancellationToken ct = default)
    {
        return PublishToActiveProviderAsync(
            ProviderMessageTypes.ProviderDecisionModeChanged,
            update,
            sessionId,
            ct);
    }

    private async ValueTask PublishToActiveProviderAsync<TPayload>(
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
