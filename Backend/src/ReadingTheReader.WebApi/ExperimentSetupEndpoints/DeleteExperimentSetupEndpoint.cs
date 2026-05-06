using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

namespace ReadingTheReader.WebApi.ExperimentSetupEndpoints;

public sealed class DeleteExperimentSetupEndpoint : EndpointWithoutRequest
{
    private readonly IExperimentSetupService _experimentSetupService;

    public DeleteExperimentSetupEndpoint(IExperimentSetupService experimentSetupService)
    {
        _experimentSetupService = experimentSetupService;
    }

    public override void Configure()
    {
        Delete("/experiment-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var id = Route<string>("id");
            await _experimentSetupService.DeleteAsync(id ?? string.Empty, ct);
            HttpContext.Response.StatusCode = StatusCodes.Status204NoContent;
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
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to delete experiment setup.", detail = ex.Message }, ct);
        }
    }
}
