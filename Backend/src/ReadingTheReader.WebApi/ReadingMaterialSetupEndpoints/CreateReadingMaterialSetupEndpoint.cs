using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.WebApi.Contracts.ReadingMaterialSetups;

namespace ReadingTheReader.WebApi.ReadingMaterialSetupEndpoints;

public sealed class CreateReadingMaterialSetupEndpoint : Endpoint<CreateReadingMaterialSetupRequest, ReadingMaterialSetup>
{
    private readonly IReadingMaterialSetupService _readingMaterialSetupService;

    public CreateReadingMaterialSetupEndpoint(IReadingMaterialSetupService readingMaterialSetupService)
    {
        _readingMaterialSetupService = readingMaterialSetupService;
    }

    public override void Configure()
    {
        Post("/reading-material-setups");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateReadingMaterialSetupRequest req, CancellationToken ct)
    {
        try
        {
            var saved = await _readingMaterialSetupService.SaveAsync(new SaveReadingMaterialSetupCommand
            {
                Title = req.Title,
                Markdown = req.Markdown,
                FontFamily = req.FontFamily,
                FontSizePx = req.FontSizePx,
                LineWidthPx = req.LineWidthPx,
                LineHeight = req.LineHeight,
                LetterSpacingEm = req.LetterSpacingEm,
                EditableByExperimenter = req.EditableByExperimenter
            }, ct);

            await Send.CreatedAtAsync<GetReadingMaterialSetupByIdEndpoint>(new { id = saved.Id }, saved, cancellation: ct);
        }
        catch (ReadingMaterialSetupValidationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to save reading material setup.", detail = ex.Message }, ct);
        }
    }
}
