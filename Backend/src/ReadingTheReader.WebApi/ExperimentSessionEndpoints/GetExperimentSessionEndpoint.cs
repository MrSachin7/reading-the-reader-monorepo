using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class GetExperimentSessionEndpoint : EndpointWithoutRequest<ExperimentSessionSnapshot>
{
    private readonly IExperimentSessionManager _experimentSessionManager;

    public GetExperimentSessionEndpoint(IExperimentSessionManager experimentSessionManager)
    {
        _experimentSessionManager = experimentSessionManager;
    }

    public override void Configure()
    {
        Get("/experiment-session");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        return Send.OkAsync(_experimentSessionManager.GetCurrentSnapshot(), ct);
    }
}
