using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class UpdateInterventionPolicyEndpoint : Endpoint<UpdateInterventionPolicyRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public UpdateInterventionPolicyEndpoint(
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Put("/experiment-session/intervention-policy");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateInterventionPolicyRequest req, CancellationToken ct)
    {
        await _runtimeAuthority.UpdateInterventionPolicyAsync(
            new ReadingInterventionPolicySnapshot(
                req.LayoutCommitBoundary,
                req.LayoutFallbackBoundary,
                req.LayoutFallbackAfterMs),
            ct);

        await Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
