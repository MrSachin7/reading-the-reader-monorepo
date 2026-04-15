using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class ExternalEyeMovementAnalysisStrategy : IEyeMovementAnalysisStrategy
{
    private readonly IAnalysisProviderGateway _analysisProviderGateway;

    public ExternalEyeMovementAnalysisStrategy(IAnalysisProviderGateway analysisProviderGateway)
    {
        _analysisProviderGateway = analysisProviderGateway;
    }

    public string ProviderId => EyeMovementAnalysisProviderIds.External;

    public async ValueTask<EyeMovementAnalysisProcessingResult?> AnalyzeAsync(
        EyeMovementAnalysisContextSnapshot context,
        CancellationToken ct = default)
    {
        if (!context.Session.IsActive || context.Session.SessionId is null)
        {
            return null;
        }

        await _analysisProviderGateway.PublishReadingObservationAsync(
            context.Session.SessionId,
            context.Observation,
            ct);
        return null;
    }
}
