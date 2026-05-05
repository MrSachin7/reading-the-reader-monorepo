using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.WebApi.Contracts.ExperimentSetups;

namespace ReadingTheReader.WebApi.ExperimentSetupEndpoints;

public sealed class CreateExperimentSetupEndpoint : Endpoint<CreateExperimentSetupRequest, ExperimentSetup>
{
    private readonly IExperimentSetupService _experimentSetupService;

    public CreateExperimentSetupEndpoint(IExperimentSetupService experimentSetupService)
    {
        _experimentSetupService = experimentSetupService;
    }

    public override void Configure()
    {
        Post("/experiment-setups");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateExperimentSetupRequest req, CancellationToken ct)
    {
        try
        {
            var saved = await _experimentSetupService.SaveAsync(new SaveExperimentSetupCommand
            {
                Name = req.Name,
                Description = req.Description,
                Status = req.Status,
                OrderMode = req.OrderMode,
                DefaultFontFamily = req.DefaultFontFamily,
                DefaultFontSizePx = req.DefaultFontSizePx,
                DefaultLineWidthPx = req.DefaultLineWidthPx,
                DefaultLineHeight = req.DefaultLineHeight,
                DefaultLetterSpacingEm = req.DefaultLetterSpacingEm,
                DefaultEditableByExperimenter = req.DefaultEditableByExperimenter,
                DecisionProviderId = req.DecisionProviderId,
                DecisionExecutionMode = req.DecisionExecutionMode,
                CalibrationRequired = req.CalibrationRequired,
                Items = req.Items.Select(item => new SaveExperimentSetupItemCommand
                {
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

            await Send.CreatedAtAsync<GetExperimentSetupByIdEndpoint>(new { id = saved.Id }, saved, cancellation: ct);
        }
        catch (ExperimentSetupValidationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to save experiment setup.", detail = ex.Message }, ct);
        }
    }
}
