using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

namespace ReadingTheReader.WebApi.ReadingMaterialSetupEndpoints;

public sealed class DeleteReadingMaterialSetupEndpoint : EndpointWithoutRequest
{
    private readonly IReadingMaterialSetupService _readingMaterialSetupService;

    public DeleteReadingMaterialSetupEndpoint(IReadingMaterialSetupService readingMaterialSetupService)
    {
        _readingMaterialSetupService = readingMaterialSetupService;
    }

    public override void Configure()
    {
        Delete("/reading-material-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var id = Route<string>("id");
            await _readingMaterialSetupService.DeleteAsync(id ?? string.Empty, ct);
            HttpContext.Response.StatusCode = StatusCodes.Status204NoContent;
        }
        catch (ReadingMaterialSetupNotFoundException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (ReadingMaterialSetupValidationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to delete reading material setup.", detail = ex.Message }, ct);
        }
    }
}
