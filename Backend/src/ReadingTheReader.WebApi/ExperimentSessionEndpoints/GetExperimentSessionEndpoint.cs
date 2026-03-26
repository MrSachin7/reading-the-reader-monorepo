using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class GetExperimentSessionEndpoint : EndpointWithoutRequest<ExperimentSessionSnapshot>
{
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetExperimentSessionEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/experiment-session");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        return Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
