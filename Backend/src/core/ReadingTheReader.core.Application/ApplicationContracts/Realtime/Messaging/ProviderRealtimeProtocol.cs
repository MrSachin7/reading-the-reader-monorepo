namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public static class ProviderProtocolVersions
{
    public const string V1 = "provider.v1";
}

public static class ProviderMessageTypes
{
    public const string ProviderHello = "providerHello";
    public const string ProviderHeartbeat = "providerHeartbeat";
    public const string ProviderSubmitProposal = "providerSubmitProposal";
    public const string ProviderRequestAutonomousApply = "providerRequestAutonomousApply";
    public const string ProviderError = "providerError";

    public const string ProviderWelcome = "providerWelcome";
    public const string ProviderSessionSnapshot = "providerSessionSnapshot";
    public const string ProviderSessionStateChanged = "providerSessionStateChanged";
    public const string ProviderDecisionContext = "providerDecisionContext";
    public const string ProviderGazeSample = "providerGazeSample";
    public const string ProviderReadingFocusChanged = "providerReadingFocusChanged";
    public const string ProviderViewportChanged = "providerViewportChanged";
    public const string ProviderAttentionSummaryChanged = "providerAttentionSummaryChanged";
    public const string ProviderInterventionEvent = "providerInterventionEvent";
    public const string ProviderDecisionModeChanged = "providerDecisionModeChanged";
    public const string ProviderStatusChanged = "providerStatusChanged";
}

public sealed record ProviderRealtimeEnvelope<TPayload>(
    string Type,
    string ProtocolVersion,
    string? ProviderId,
    string? SessionId,
    string? CorrelationId,
    long? SentAtUnixMs,
    TPayload Payload);

public sealed record ProviderHelloRealtimePayload(
    string ProviderId,
    string DisplayName,
    string ProtocolVersion,
    string AuthToken,
    bool SupportsAdvisoryExecution,
    bool SupportsAutonomousExecution,
    IReadOnlyList<string>? SupportedInterventionModuleIds);

public sealed record ProviderHeartbeatRealtimePayload(
    string ProviderId,
    string ProtocolVersion,
    long SentAtUnixMs);

public sealed record ProviderReadingPresentationPatchRealtimePayload(
    string? FontFamily,
    int? FontSizePx,
    int? LineWidthPx,
    double? LineHeight,
    double? LetterSpacingEm,
    bool? EditableByResearcher);

public sealed record ProviderReaderAppearancePatchRealtimePayload(
    string? ThemeMode,
    string? Palette,
    string? AppFont);

public sealed record ProviderProposedInterventionRealtimePayload(
    string? ModuleId,
    string Trigger,
    string Reason,
    ProviderReadingPresentationPatchRealtimePayload Presentation,
    ProviderReaderAppearancePatchRealtimePayload Appearance,
    IReadOnlyDictionary<string, string?>? Parameters);

public sealed record ProviderSubmitProposalRealtimePayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ProposalId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    ProviderProposedInterventionRealtimePayload ProposedIntervention);

public sealed record ProviderRequestAutonomousApplyRealtimePayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    ProviderProposedInterventionRealtimePayload RequestedIntervention);

public sealed record ProviderErrorRealtimePayload(
    string ProviderId,
    string Code,
    string Message,
    string? Detail = null);

public sealed record ProviderWelcomeRealtimePayload(
    string ProviderId,
    string DisplayName,
    string AcceptedProtocolVersion,
    string Status,
    long RegisteredAtUnixMs,
    int HeartbeatTimeoutMilliseconds);
