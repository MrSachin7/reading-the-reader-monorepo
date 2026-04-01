namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public static class MessageTypes
{
    public const string GazeSample = "gazeSample";
    public const string SubscribeGazeData = "subscribeGazeData";
    public const string UnsubscribeGazeData = "unsubscribeGazeData";
    public const string Stats = "stats";
    public const string Ping = "ping";
    public const string Pong = "pong";
    public const string InterventionEvent = "interventionEvent";

    public const string StartExperiment = "startExperiment";
    public const string StopExperiment = "stopExperiment";
    public const string GetExperimentState = "getExperimentState";
    public const string ExperimentStarted = "experimentStarted";
    public const string ExperimentStopped = "experimentStopped";
    public const string ExperimentState = "experimentState";
    public const string CalibrationStateChanged = "calibrationStateChanged";
    public const string ResearcherCommand = "researcherCommand";
    public const string ReadingSessionChanged = "readingSessionChanged";
    public const string ParticipantViewportChanged = "participantViewportChanged";
    public const string ReadingFocusChanged = "readingFocusChanged";
    public const string ReadingContextPreservationChanged = "readingContextPreservationChanged";
    public const string ReadingAttentionSummaryChanged = "readingAttentionSummaryChanged";
    public const string RegisterParticipantView = "registerParticipantView";
    public const string UnregisterParticipantView = "unregisterParticipantView";
    public const string ParticipantViewportUpdated = "participantViewportUpdated";
    public const string ReadingFocusUpdated = "readingFocusUpdated";
    public const string ReadingContextPreservationUpdated = "readingContextPreservationUpdated";
    public const string ReadingAttentionSummaryUpdated = "readingAttentionSummaryUpdated";
    public const string ApplyIntervention = "applyIntervention";
    public const string DecisionProposalChanged = "decisionProposalChanged";
    public const string ApproveDecisionProposal = "approveDecisionProposal";
    public const string RejectDecisionProposal = "rejectDecisionProposal";
    public const string PauseDecisionAutomation = "pauseDecisionAutomation";
    public const string ResumeDecisionAutomation = "resumeDecisionAutomation";
    public const string SetDecisionExecutionMode = "setDecisionExecutionMode";
    public const string Error = "error";
}
