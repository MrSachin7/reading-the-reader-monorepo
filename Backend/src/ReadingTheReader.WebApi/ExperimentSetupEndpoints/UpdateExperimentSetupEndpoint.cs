using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.WebApi.Contracts.ExperimentSetups;

namespace ReadingTheReader.WebApi.ExperimentSetupEndpoints;

public sealed class UpdateExperimentSetupEndpoint : Endpoint<UpdateExperimentSetupRequest, ExperimentSetup>
{
    private readonly IExperimentSetupService _experimentSetupService;

    public UpdateExperimentSetupEndpoint(IExperimentSetupService experimentSetupService)
    {
        _experimentSetupService = experimentSetupService;
    }

    public override void Configure()
    {
        Put("/experiment-setups/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateExperimentSetupRequest req, CancellationToken ct)
    {
        try
        {
            var id = Route<string>("id");
            var updated = await _experimentSetupService.UpdateAsync(new UpdateExperimentSetupCommand
            {
                Id = id ?? string.Empty,
                Name = req.Name,
                Description = req.Description,
                Items = req.Items.Select(item => new UpdateExperimentSetupItemCommand
                {
                    Id = item.Id,
                    SourceReadingMaterialSetupId = item.SourceReadingMaterialSetupId,
                    SourceReadingMaterialTitle = item.SourceReadingMaterialTitle,
                    Title = item.Title,
                    Markdown = item.Markdown,
                    ResearcherQuestions = item.ResearcherQuestions,
                    FontFamily = item.FontFamily,
                    FontSizePx = item.FontSizePx,
                    LineWidthPx = item.LineWidthPx,
                    LineHeight = item.LineHeight,
                    LetterSpacingEm = item.LetterSpacingEm,
                    EditableByExperimenter = item.EditableByExperimenter
                }).ToArray()
            }, ct);

            await Send.OkAsync(updated, ct);
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
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to update experiment setup.", detail = ex.Message }, ct);
        }
    }
}
