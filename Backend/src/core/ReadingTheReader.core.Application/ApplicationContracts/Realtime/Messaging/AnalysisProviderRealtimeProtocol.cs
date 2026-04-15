using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public static class AnalysisProviderProtocolVersions
{
    public const string V1 = "analysis-provider.v1";
}

public static class AnalysisProviderMessageTypes
{
    public const string AnalysisProviderHello = "analysisProviderHello";
    public const string AnalysisProviderHeartbeat = "analysisProviderHeartbeat";
    public const string AnalysisProviderSubmitAnalysis = "analysisProviderSubmitAnalysis";
    public const string AnalysisProviderError = "analysisProviderError";

    public const string AnalysisProviderWelcome = "analysisProviderWelcome";
    public const string AnalysisProviderSessionSnapshot = "analysisProviderSessionSnapshot";
    public const string AnalysisProviderGazeSample = "analysisProviderGazeSample";
    public const string AnalysisProviderReadingObservation = "analysisProviderReadingObservation";
    public const string AnalysisProviderViewportChanged = "analysisProviderViewportChanged";
    public const string AnalysisProviderStateChanged = "analysisProviderStateChanged";
}

public sealed record AnalysisProviderRealtimeEnvelope<TPayload>(
    string Type,
    string ProtocolVersion,
    string? ProviderId,
    string? SessionId,
    string? CorrelationId,
    long? SentAtUnixMs,
    TPayload Payload);

public sealed record AnalysisProviderHelloRealtimePayload(
    string ProviderId,
    string DisplayName,
    string ProtocolVersion,
    string AuthToken);

public sealed record AnalysisProviderHeartbeatRealtimePayload(
    string ProviderId,
    string ProtocolVersion,
    long SentAtUnixMs);

public sealed record AnalysisProviderSubmitAnalysisRealtimePayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    long ObservedAtUnixMs,
    FixationSnapshot? CurrentFixation,
    FixationSnapshot? CompletedFixation,
    SaccadeSnapshot? CompletedSaccade,
    EyeMovementAnalysisSnapshot AnalysisState);

public sealed record AnalysisProviderErrorRealtimePayload(
    string ProviderId,
    string Code,
    string Message,
    string? Detail = null);

public sealed record AnalysisProviderWelcomeRealtimePayload(
    string ProviderId,
    string DisplayName,
    string AcceptedProtocolVersion,
    string Status,
    long RegisteredAtUnixMs,
    int HeartbeatTimeoutMilliseconds);
