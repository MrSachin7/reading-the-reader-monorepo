using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public sealed class ExperimentCommandIngress : IExperimentCommandIngress
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IReaderObservationService _readerObservationService;
    private readonly IClientBroadcasterAdapter _clientBroadcasterAdapter;

    public ExperimentCommandIngress(
        IExperimentRuntimeAuthority runtimeAuthority,
        IReaderObservationService readerObservationService,
        IClientBroadcasterAdapter clientBroadcasterAdapter)
    {
        _runtimeAuthority = runtimeAuthority;
        _readerObservationService = readerObservationService;
        _clientBroadcasterAdapter = clientBroadcasterAdapter;
    }

    public async Task HandleAsync(IRealtimeIngressCommand command, CancellationToken ct = default)
    {
        switch (command)
        {
            case PingRealtimeCommand ping:
                await _clientBroadcasterAdapter.SendToClientAsync(ping.ConnectionId, MessageTypes.Pong, new
                {
                    serverTimeUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                }, ct);
                return;

            case StartExperimentRealtimeCommand:
                await _runtimeAuthority.StartSessionAsync(ct);
                return;

            case StopExperimentRealtimeCommand:
                await _runtimeAuthority.StopSessionAsync(ct);
                return;

            case SubscribeGazeDataRealtimeCommand subscribe:
                await _runtimeAuthority.SubscribeGazeDataAsync(subscribe.ConnectionId, ct);
                return;

            case UnsubscribeGazeDataRealtimeCommand unsubscribe:
                await _runtimeAuthority.UnsubscribeGazeDataAsync(unsubscribe.ConnectionId, ct);
                return;

            case MouseGazeSampleRealtimeCommand mouseGazeSample:
                await _runtimeAuthority.SubmitMouseGazeSampleAsync(
                    mouseGazeSample.ConnectionId,
                    mouseGazeSample.Payload,
                    ct);
                return;

            case GetExperimentStateRealtimeCommand getState:
                await _clientBroadcasterAdapter.SendToClientAsync(
                    getState.ConnectionId,
                    MessageTypes.ExperimentState,
                    _runtimeAuthority.GetCurrentSnapshot(),
                    ct);
                return;

            case RegisterParticipantViewRealtimeCommand registerParticipantView:
                await _readerObservationService.RegisterParticipantViewAsync(registerParticipantView.ConnectionId, ct);
                return;

            case UnregisterParticipantViewRealtimeCommand unregisterParticipantView:
                await _readerObservationService.DisconnectParticipantViewAsync(unregisterParticipantView.ConnectionId, ct);
                return;

            case ParticipantViewportUpdatedRealtimeCommand viewportUpdated:
                await _readerObservationService.UpdateParticipantViewportAsync(
                    viewportUpdated.ConnectionId,
                    viewportUpdated.Payload,
                    ct);
                return;

            case ReadingFocusUpdatedRealtimeCommand readingFocusUpdated:
                await _readerObservationService.UpdateReadingFocusAsync(readingFocusUpdated.Payload, ct);
                return;

            case ReadingGazeObservationUpdatedRealtimeCommand readingObservationUpdated:
                await _readerObservationService.UpdateReadingGazeObservationAsync(
                    readingObservationUpdated.Payload,
                    ct);
                return;

            case ReadingContextPreservationUpdatedRealtimeCommand contextPreservationUpdated:
                await _readerObservationService.UpdateReadingContextPreservationAsync(
                    contextPreservationUpdated.Payload,
                    ct);
                return;

            case ReadingAttentionSummaryUpdatedRealtimeCommand attentionSummaryUpdated:
                await _readerObservationService.UpdateReadingAttentionSummaryAsync(attentionSummaryUpdated.Payload, ct);
                return;

            case ApplyInterventionRealtimeCommand applyIntervention:
                await _runtimeAuthority.ApplyInterventionAsync(applyIntervention.Payload, ct);
                return;

            case ApproveDecisionProposalRealtimeCommand approveDecisionProposal:
                await _runtimeAuthority.ApproveDecisionProposalAsync(
                    approveDecisionProposal.ProposalId,
                    "researcher",
                    ct);
                return;

            case RejectDecisionProposalRealtimeCommand rejectDecisionProposal:
                await _runtimeAuthority.RejectDecisionProposalAsync(
                    rejectDecisionProposal.ProposalId,
                    "researcher",
                    ct);
                return;

            case PauseDecisionAutomationRealtimeCommand:
                await _runtimeAuthority.SetDecisionAutomationPausedAsync(true, ct);
                return;

            case ResumeDecisionAutomationRealtimeCommand:
                await _runtimeAuthority.SetDecisionAutomationPausedAsync(false, ct);
                return;

            case SetDecisionExecutionModeRealtimeCommand setDecisionExecutionMode:
                await _runtimeAuthority.SetDecisionExecutionModeAsync(setDecisionExecutionMode.ExecutionMode, ct);
                return;

            case DisconnectClientRealtimeCommand disconnect:
                await _runtimeAuthority.UnsubscribeGazeDataAsync(disconnect.ConnectionId, ct);
                await _readerObservationService.DisconnectParticipantViewAsync(disconnect.ConnectionId, ct);
                return;

            case InvalidRealtimeCommand invalid:
                await SendErrorAsync(invalid.ConnectionId, invalid.ErrorMessage, ct);
                return;

            case UnsupportedRealtimeCommand unsupported:
                await SendErrorAsync(
                    unsupported.ConnectionId,
                    $"Unsupported message type '{unsupported.MessageType}'",
                    ct);
                return;

            default:
                await SendErrorAsync(command.ConnectionId, "Unsupported realtime command.", ct);
                return;
        }
    }

    private async Task SendErrorAsync(string connectionId, string message, CancellationToken ct)
    {
        await _clientBroadcasterAdapter.SendToClientAsync(connectionId, MessageTypes.Error, new
        {
            message
        }, ct);
    }
}
