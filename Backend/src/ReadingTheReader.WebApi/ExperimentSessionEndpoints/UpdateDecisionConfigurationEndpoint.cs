using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class UpdateDecisionConfigurationEndpoint : Endpoint<UpdateDecisionConfigurationRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public UpdateDecisionConfigurationEndpoint(
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Put("/experiment-session/decision-configuration");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateDecisionConfigurationRequest req, CancellationToken ct)
    {
        await _runtimeAuthority.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                req.ConditionLabel,
                req.ProviderId,
                req.ExecutionMode),
            req.AutomationPaused,
            ct);

        await Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
