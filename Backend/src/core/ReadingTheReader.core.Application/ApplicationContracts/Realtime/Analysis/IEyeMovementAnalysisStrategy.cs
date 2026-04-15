using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record EyeMovementAnalysisContextSnapshot(
    ExperimentSessionSnapshot Session,
    EyeMovementAnalysisConfigurationSnapshot Configuration,
    EyeMovementAnalysisRuntimeState RuntimeState,
    ReadingGazeObservationSnapshot Observation);

public sealed record EyeMovementAnalysisProcessingResult(EyeMovementAnalysisRuntimeState RuntimeState);

public interface IEyeMovementAnalysisStrategy
{
    string ProviderId { get; }

    ValueTask<EyeMovementAnalysisProcessingResult?> AnalyzeAsync(
        EyeMovementAnalysisContextSnapshot context,
        CancellationToken ct = default);
}
