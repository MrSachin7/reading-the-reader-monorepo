using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class ApplyPendingInterventionNowEndpoint : EndpointWithoutRequest<ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public ApplyPendingInterventionNowEndpoint(
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Post("/experiment-session/intervention-policy/apply-now");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await _runtimeAuthority.ApplyPendingInterventionNowAsync(ct);
        await Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
