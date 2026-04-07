using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public sealed class ExternalDecisionStrategy : IDecisionStrategy
{
    private readonly IExternalProviderGateway _externalProviderGateway;

    public ExternalDecisionStrategy(IExternalProviderGateway externalProviderGateway)
    {
        _externalProviderGateway = externalProviderGateway;
    }

    public string ProviderId => DecisionProviderIds.External;

    public async ValueTask<DecisionProposalSnapshot?> EvaluateAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        if (!context.IsSessionActive ||
            context.AutomationPaused ||
            context.SessionId is null)
        {
            return null;
        }

        await _externalProviderGateway.PublishDecisionContextAsync(context, ct);
        return null;
    }
}
