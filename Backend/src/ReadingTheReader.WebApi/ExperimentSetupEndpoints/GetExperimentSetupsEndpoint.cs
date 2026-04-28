using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

namespace ReadingTheReader.WebApi.ExperimentSetupEndpoints;

public sealed class GetExperimentSetupsEndpoint : EndpointWithoutRequest<IReadOnlyCollection<ExperimentSetup>>
{
    private readonly IExperimentSetupService _experimentSetupService;

    public GetExperimentSetupsEndpoint(IExperimentSetupService experimentSetupService)
    {
        _experimentSetupService = experimentSetupService;
    }

    public override void Configure()
    {
        Get("/experiment-setups");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await _experimentSetupService.ListAsync(ct), ct);
    }
}
