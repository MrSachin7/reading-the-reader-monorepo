namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public static class InterventionsModuleIds
{
    public const string ModuleId = "interventions";
}

public static class InterventionsProtocolVersions
{
    public const string V1 = "interventions.v1";
}

public static class InterventionsInboundMessageTypes
{
    public const string SubmitProposal = "submitProposal";
    public const string RequestAutonomousApply = "requestAutonomousApply";
    public const string ProviderError = "providerError";
}

public static class InterventionsOutboundMessageTypes
{
    public const string DecisionContext = "decisionContext";
    public const string SessionSnapshot = "sessionSnapshot";
    public const string GazeSample = "gazeSample";
    public const string ReadingFocusChanged = "readingFocusChanged";
    public const string ViewportChanged = "viewportChanged";
    public const string AttentionSummaryChanged = "attentionSummaryChanged";
    public const string InterventionEvent = "interventionEvent";
    public const string DecisionModeChanged = "decisionModeChanged";
    public const string Error = "error";
}

public static class InterventionsModuleCapabilityKeys
{
    public const string SupportsAdvisoryExecution = "supportsAdvisoryExecution";
    public const string SupportsAutonomousExecution = "supportsAutonomousExecution";
    public const string SupportedInterventionModuleIds = "supportedInterventionModuleIds";
}

public sealed record InterventionsReadingPresentationPatchPayload(
    string? FontFamily,
    int? FontSizePx,
    int? LineWidthPx,
    double? LineHeight,
    double? LetterSpacingEm,
    bool? EditableByResearcher);

public sealed record InterventionsAppearancePatchPayload(
    string? ThemeMode,
    string? Palette,
    string? AppFont);

public sealed record InterventionsProposedInterventionPayload(
    string? ModuleId,
    string Trigger,
    string Reason,
    InterventionsReadingPresentationPatchPayload Presentation,
    InterventionsAppearancePatchPayload Appearance,
    IReadOnlyDictionary<string, string?>? Parameters);

public sealed record InterventionsSubmitProposalPayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ProposalId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    InterventionsProposedInterventionPayload ProposedIntervention);

public sealed record InterventionsRequestAutonomousApplyPayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    InterventionsProposedInterventionPayload RequestedIntervention);

public sealed record InterventionsErrorPayload(
    string Code,
    string Message,
    string? Detail = null);
