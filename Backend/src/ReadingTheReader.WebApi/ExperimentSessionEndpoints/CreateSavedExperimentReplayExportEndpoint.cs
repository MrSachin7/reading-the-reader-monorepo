using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class CreateSavedExperimentReplayExportEndpoint : Endpoint<SaveExperimentReplayExportRequest, SavedExperimentReplayExportSummary>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;

    public CreateSavedExperimentReplayExportEndpoint(IExperimentRuntimeAuthority runtimeAuthority)
    {
        _runtimeAuthority = runtimeAuthority;
    }

    public override void Configure()
    {
        Post("/experiment-replay-exports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SaveExperimentReplayExportRequest req, CancellationToken ct)
    {
        try
        {
            if (!ExperimentReplayExportFormats.IsSupported(req.Format))
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await HttpContext.Response.WriteAsJsonAsync(new { message = "Replay export format must be 'json' or 'csv'." }, ct);
                return;
            }

            var saved = await _runtimeAuthority.SaveLatestReplayExportAsync(
                new SaveExperimentReplayExportCommand(req.Name, req.Format),
                ct);

            await Send.CreatedAtAsync<GetSavedExperimentReplayExportByIdEndpoint>(new { id = saved.Id }, saved, cancellation: ct);
        }
        catch (InvalidOperationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (IOException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "Failed to save the replay export.", detail = ex.Message }, ct);
        }
    }
}
