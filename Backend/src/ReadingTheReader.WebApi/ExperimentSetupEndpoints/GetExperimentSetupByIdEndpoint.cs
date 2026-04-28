using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

namespace ReadingTheReader.WebApi.ExperimentSetupEndpoints;

public sealed class GetExperimentSetupByIdRequest
{
    public string Id { get; set; } = string.Empty;
}

public sealed class GetExperimentSetupByIdEndpoint : Endpoint<GetExperimentSetupByIdRequest, ExperimentSetup>
{
    private readonly IExperimentSetupService _experimentSetupService;

    public GetExperimentSetupByIdEndpoint(IExperimentSetupService experimentSetupService)
    {
        _experimentSetupService = experimentSetupService;
    }

    public override void Configure()
    {
        Get("/experiment-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetExperimentSetupByIdRequest req, CancellationToken ct)
    {
        try
        {
            await Send.OkAsync(await _experimentSetupService.GetByIdAsync(req.Id, ct), ct);
        }
        catch (ExperimentSetupNotFoundException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (ExperimentSetupValidationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}
