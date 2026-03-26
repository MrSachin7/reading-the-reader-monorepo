using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class FinishExperimentEndpoint : Endpoint<FinishExperimentRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;

    public FinishExperimentEndpoint(IExperimentRuntimeAuthority runtimeAuthority)
    {
        _runtimeAuthority = runtimeAuthority;
    }

    public override void Configure()
    {
        Post("/experiment-session/finish");
        AllowAnonymous();
    }

    public override async Task HandleAsync(FinishExperimentRequest req, CancellationToken ct)
    {
        var snapshot = await _runtimeAuthority.FinishSessionAsync(
            new FinishExperimentCommand(req.Source),
            ct);

        await Send.OkAsync(snapshot, ct);
    }
}
