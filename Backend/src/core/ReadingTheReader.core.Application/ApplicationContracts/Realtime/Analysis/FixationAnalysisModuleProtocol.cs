using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public static class FixationAnalysisModuleIds
{
    public const string ModuleId = "fixation-analysis";
}

public static class FixationAnalysisProtocolVersions
{
    public const string V1 = "fixation-analysis.v1";
}

public static class FixationAnalysisInboundMessageTypes
{
    public const string SubmitAnalysis = "submitAnalysis";
    public const string ProviderError = "providerError";
}

public static class FixationAnalysisOutboundMessageTypes
{
    public const string SessionSnapshot = "sessionSnapshot";
    public const string GazeSample = "gazeSample";
    public const string ReadingObservation = "readingObservation";
    public const string ViewportChanged = "viewportChanged";
    public const string StateChanged = "stateChanged";
    public const string Error = "error";
}

public sealed record FixationAnalysisSubmitAnalysisPayload(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    long ObservedAtUnixMs,
    FixationSnapshot? CurrentFixation,
    FixationSnapshot? CompletedFixation,
    SaccadeSnapshot? CompletedSaccade,
    EyeMovementAnalysisSnapshot AnalysisState);

public sealed record FixationAnalysisErrorPayload(
    string Code,
    string Message,
    string? Detail = null);
