using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

namespace ReadingTheReader.WebApi.ReadingMaterialSetupEndpoints;

public sealed class GetReadingMaterialSetupByIdEndpoint : EndpointWithoutRequest<ReadingMaterialSetup>
{
    private readonly IReadingMaterialSetupService _readingMaterialSetupService;

    public GetReadingMaterialSetupByIdEndpoint(IReadingMaterialSetupService readingMaterialSetupService)
    {
        _readingMaterialSetupService = readingMaterialSetupService;
    }

    public override void Configure()
    {
        Get("/reading-material-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<string>("id");

        try
        {
            var item = await _readingMaterialSetupService.GetByIdAsync(id ?? string.Empty, ct);
            await Send.OkAsync(item, ct);
        }
        catch (ReadingMaterialSetupValidationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (ReadingMaterialSetupNotFoundException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to load reading material setup.", detail = ex.Message }, ct);
        }
    }
}
