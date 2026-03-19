using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.WebApi.Contracts.ReadingMaterialSetups;

namespace ReadingTheReader.WebApi.ReadingMaterialSetupEndpoints;

public sealed class UpdateReadingMaterialSetupEndpoint : Endpoint<UpdateReadingMaterialSetupRequest, ReadingMaterialSetup>
{
    private readonly IReadingMaterialSetupService _readingMaterialSetupService;

    public UpdateReadingMaterialSetupEndpoint(IReadingMaterialSetupService readingMaterialSetupService)
    {
        _readingMaterialSetupService = readingMaterialSetupService;
    }

    public override void Configure()
    {
        Put("/reading-material-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateReadingMaterialSetupRequest req, CancellationToken ct)
    {
        var id = Route<string>("id");

        try
        {
            var updated = await _readingMaterialSetupService.UpdateAsync(new UpdateReadingMaterialSetupCommand
            {
                Id = id ?? string.Empty,
                Title = req.Title,
                Markdown = req.Markdown,
                FontFamily = req.FontFamily,
                FontSizePx = req.FontSizePx,
                LineWidthPx = req.LineWidthPx,
                LineHeight = req.LineHeight,
                LetterSpacingEm = req.LetterSpacingEm,
                EditableByExperimenter = req.EditableByExperimenter
            }, ct);

            await Send.OkAsync(updated, ct);
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
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to update reading material setup.", detail = ex.Message }, ct);
        }
    }
}
