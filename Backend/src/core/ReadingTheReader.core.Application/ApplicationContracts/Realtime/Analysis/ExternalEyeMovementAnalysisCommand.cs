using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record ExternalEyeMovementAnalysisCommand(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    long ObservedAtUnixMs,
    FixationSnapshot? CurrentFixation,
    FixationSnapshot? CompletedFixation,
    SaccadeSnapshot? CompletedSaccade,
    EyeMovementAnalysisSnapshot AnalysisState);
