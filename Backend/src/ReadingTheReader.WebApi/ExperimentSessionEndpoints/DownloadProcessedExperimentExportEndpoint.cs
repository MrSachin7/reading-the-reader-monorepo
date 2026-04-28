using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class DownloadProcessedExperimentExportEndpoint : EndpointWithoutRequest
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public DownloadProcessedExperimentExportEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/experiment-session/export/processed");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var exportDocument = await _experimentSessionQueryService.GetLatestProcessedExportAsync(ct);
        if (exportDocument is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "No completed processed experiment export is available yet."
            }, ct);
            return;
        }

        var sessionId = exportDocument.Experiment.SessionId?.ToString("N") ?? "latest";
        var fileName = $"experiment-processed-{sessionId}.json";

        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = "application/json; charset=utf-8";
        HttpContext.Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        await HttpContext.Response.WriteAsync(JsonSerializer.Serialize(exportDocument, JsonOptions), ct);
    }
}
