using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class GetSavedExperimentReplayExportByIdEndpoint : EndpointWithoutRequest<ExperimentReplayExport>
{
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetSavedExperimentReplayExportByIdEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/experiment-replay-exports/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<string>("id");
        var export = await _experimentSessionQueryService.GetSavedReplayExportByIdAsync(id ?? string.Empty, ct);
        if (export is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "That saved replay export does not exist."
            }, ct);
            return;
        }

        await Send.OkAsync(export, ct);
    }
}
