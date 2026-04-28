using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public interface IRealtimeIngressCommand
{
    string ConnectionId { get; }
}

public sealed record PingRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record StartExperimentRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record StopExperimentRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record SubscribeGazeDataRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record UnsubscribeGazeDataRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record MouseGazeSampleRealtimeCommand(
    string ConnectionId,
    GazeData Payload) : IRealtimeIngressCommand;

public sealed record GetExperimentStateRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record RegisterParticipantViewRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record UnregisterParticipantViewRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record ParticipantViewportUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateParticipantViewportCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingFocusUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateReadingFocusCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingEnrichedGazeSampleUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateEnrichedGazeSampleCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingGazeObservationUpdatedRealtimeCommand(
    string ConnectionId,
    ReadingGazeObservationCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingContextPreservationUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateReadingContextPreservationCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingAttentionSummaryUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateReadingAttentionSummaryCommand Payload) : IRealtimeIngressCommand;

public sealed record ApplyInterventionRealtimeCommand(
    string ConnectionId,
    ApplyInterventionCommand Payload) : IRealtimeIngressCommand;

public sealed record ApproveDecisionProposalRealtimeCommand(
    string ConnectionId,
    Guid ProposalId) : IRealtimeIngressCommand;

public sealed record RejectDecisionProposalRealtimeCommand(
    string ConnectionId,
    Guid ProposalId) : IRealtimeIngressCommand;

public sealed record PauseDecisionAutomationRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record ResumeDecisionAutomationRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record SetDecisionExecutionModeRealtimeCommand(
    string ConnectionId,
    string ExecutionMode) : IRealtimeIngressCommand;

public sealed record DisconnectClientRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record InvalidRealtimeCommand(
    string ConnectionId,
    string ErrorMessage) : IRealtimeIngressCommand;

public sealed record UnsupportedRealtimeCommand(
    string ConnectionId,
    string MessageType) : IRealtimeIngressCommand;

public static class RealtimeIngressCommandFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IRealtimeIngressCommand Create(string connectionId, string messageType, JsonElement payload)
    {
        return messageType switch
        {
            MessageTypes.Ping => new PingRealtimeCommand(connectionId),
            MessageTypes.StartExperiment => new StartExperimentRealtimeCommand(connectionId),
            MessageTypes.StopExperiment => new StopExperimentRealtimeCommand(connectionId),
            MessageTypes.SubscribeGazeData => new SubscribeGazeDataRealtimeCommand(connectionId),
            MessageTypes.UnsubscribeGazeData => new UnsubscribeGazeDataRealtimeCommand(connectionId),
            MessageTypes.MouseGazeSample => Deserialize<GazeData>(
                payload,
                connectionId,
                "Mouse gaze sample payload is invalid.",
                parsed => new MouseGazeSampleRealtimeCommand(connectionId, parsed)),
            MessageTypes.GetExperimentState => new GetExperimentStateRealtimeCommand(connectionId),
            MessageTypes.RegisterParticipantView => new RegisterParticipantViewRealtimeCommand(connectionId),
            MessageTypes.UnregisterParticipantView => new UnregisterParticipantViewRealtimeCommand(connectionId),
            MessageTypes.ParticipantViewportUpdated => Deserialize<UpdateParticipantViewportCommand>(
                payload,
                connectionId,
                "Participant viewport payload is invalid.",
                parsed => new ParticipantViewportUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingFocusUpdated => Deserialize<UpdateReadingFocusCommand>(
                payload,
                connectionId,
                "Reading focus payload is invalid.",
                parsed => new ReadingFocusUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingEnrichedGazeSampleUpdated => Deserialize<UpdateEnrichedGazeSampleCommand>(
                payload,
                connectionId,
                "Reading enriched gaze sample payload is invalid.",
                parsed => new ReadingEnrichedGazeSampleUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingGazeObservationUpdated => Deserialize<ReadingGazeObservationCommand>(
                payload,
                connectionId,
                "Reading gaze observation payload is invalid.",
                parsed => new ReadingGazeObservationUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingContextPreservationUpdated => Deserialize<UpdateReadingContextPreservationCommand>(
                payload,
                connectionId,
                "Reading context preservation payload is invalid.",
                parsed => new ReadingContextPreservationUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingAttentionSummaryUpdated => Deserialize<UpdateReadingAttentionSummaryCommand>(
                payload,
                connectionId,
                "Reading attention summary payload is invalid.",
                parsed => new ReadingAttentionSummaryUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ApplyIntervention => Deserialize<ApplyInterventionCommand>(
                payload,
                connectionId,
                "Intervention payload is invalid.",
                parsed => new ApplyInterventionRealtimeCommand(connectionId, parsed)),
            MessageTypes.ApproveDecisionProposal => Deserialize<DecisionProposalRealtimePayload>(
                payload,
                connectionId,
                "Decision proposal payload is invalid.",
                parsed => new ApproveDecisionProposalRealtimeCommand(connectionId, parsed.ProposalId)),
            MessageTypes.RejectDecisionProposal => Deserialize<DecisionProposalRealtimePayload>(
                payload,
                connectionId,
                "Decision proposal payload is invalid.",
                parsed => new RejectDecisionProposalRealtimeCommand(connectionId, parsed.ProposalId)),
            MessageTypes.PauseDecisionAutomation => new PauseDecisionAutomationRealtimeCommand(connectionId),
            MessageTypes.ResumeDecisionAutomation => new ResumeDecisionAutomationRealtimeCommand(connectionId),
            MessageTypes.SetDecisionExecutionMode => Deserialize<SetDecisionExecutionModeRealtimePayload>(
                payload,
                connectionId,
                "Decision execution mode payload is invalid.",
                parsed => new SetDecisionExecutionModeRealtimeCommand(connectionId, parsed.ExecutionMode)),
            MessageTypes.ResearcherCommand => ParseResearcherCommand(connectionId, payload),
            _ => new UnsupportedRealtimeCommand(connectionId, messageType)
        };
    }

    private static IRealtimeIngressCommand ParseResearcherCommand(string connectionId, JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Object &&
            payload.TryGetProperty("command", out var command) &&
            command.ValueKind == JsonValueKind.String)
        {
            var commandValue = command.GetString();
            if (string.Equals(commandValue, MessageTypes.StartExperiment, StringComparison.OrdinalIgnoreCase))
            {
                return new StartExperimentRealtimeCommand(connectionId);
            }

            if (string.Equals(commandValue, MessageTypes.StopExperiment, StringComparison.OrdinalIgnoreCase))
            {
                return new StopExperimentRealtimeCommand(connectionId);
            }

            if (string.Equals(commandValue, MessageTypes.ApproveDecisionProposal, StringComparison.OrdinalIgnoreCase) &&
                TryParseProposalPayload(payload, out var approveProposalId))
            {
                return new ApproveDecisionProposalRealtimeCommand(connectionId, approveProposalId);
            }

            if (string.Equals(commandValue, MessageTypes.RejectDecisionProposal, StringComparison.OrdinalIgnoreCase) &&
                TryParseProposalPayload(payload, out var rejectProposalId))
            {
                return new RejectDecisionProposalRealtimeCommand(connectionId, rejectProposalId);
            }

            if (string.Equals(commandValue, MessageTypes.PauseDecisionAutomation, StringComparison.OrdinalIgnoreCase))
            {
                return new PauseDecisionAutomationRealtimeCommand(connectionId);
            }

            if (string.Equals(commandValue, MessageTypes.ResumeDecisionAutomation, StringComparison.OrdinalIgnoreCase))
            {
                return new ResumeDecisionAutomationRealtimeCommand(connectionId);
            }

            if (string.Equals(commandValue, MessageTypes.SetDecisionExecutionMode, StringComparison.OrdinalIgnoreCase) &&
                payload.TryGetProperty("executionMode", out var executionModeElement) &&
                executionModeElement.ValueKind == JsonValueKind.String)
            {
                return new SetDecisionExecutionModeRealtimeCommand(connectionId, executionModeElement.GetString() ?? string.Empty);
            }
        }

        return new InvalidRealtimeCommand(connectionId, "Unsupported researcher command");
    }

    private static bool TryParseProposalPayload(JsonElement payload, out Guid proposalId)
    {
        proposalId = Guid.Empty;
        return payload.TryGetProperty("proposalId", out var proposalIdElement) &&
               proposalIdElement.ValueKind == JsonValueKind.String &&
               Guid.TryParse(proposalIdElement.GetString(), out proposalId);
    }

    private static IRealtimeIngressCommand Deserialize<TPayload>(
        JsonElement payload,
        string connectionId,
        string errorMessage,
        Func<TPayload, IRealtimeIngressCommand> factory)
    {
        try
        {
            var parsed = payload.Deserialize<TPayload>(JsonOptions);
            return parsed is null
                ? new InvalidRealtimeCommand(connectionId, errorMessage)
                : factory(parsed);
        }
        catch
        {
            return new InvalidRealtimeCommand(connectionId, errorMessage);
        }
    }

    private sealed record DecisionProposalRealtimePayload(Guid ProposalId);

    private sealed record SetDecisionExecutionModeRealtimePayload(string ExecutionMode);
}
