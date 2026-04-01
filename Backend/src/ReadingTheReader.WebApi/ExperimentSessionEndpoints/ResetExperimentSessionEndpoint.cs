using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class ResetExperimentSessionEndpoint : EndpointWithoutRequest<ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;

    public ResetExperimentSessionEndpoint(IExperimentRuntimeAuthority runtimeAuthority)
    {
        _runtimeAuthority = runtimeAuthority;
    }

    public override void Configure()
    {
        Post("/experiment-session/reset");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var snapshot = await _runtimeAuthority.ResetSessionAsync(ct);
        await Send.OkAsync(snapshot, ct);
    }
}
