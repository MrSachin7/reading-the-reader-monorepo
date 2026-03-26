using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class DownloadExperimentExportEndpoint : EndpointWithoutRequest
{
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;
    private readonly IExperimentReplayExportSerializer _serializer;

    public DownloadExperimentExportEndpoint(
        IExperimentSessionQueryService experimentSessionQueryService,
        IExperimentReplayExportSerializer serializer)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
        _serializer = serializer;
    }

    public override void Configure()
    {
        Get("/experiment-session/export");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var formatQuery = Query<string>("format");
        if (!string.IsNullOrWhiteSpace(formatQuery) && !ExperimentReplayExportFormats.IsSupported(formatQuery))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "Replay export format must be either 'json' or 'csv'."
            }, ct);
            return;
        }

        var format = ExperimentReplayExportFormats.Normalize(formatQuery);
        var exportDocument = await _experimentSessionQueryService.GetLatestReplayExportAsync(ct);
        if (exportDocument is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "No completed experiment export is available yet."
            }, ct);
            return;
        }

        var sessionId = exportDocument.Metadata.SessionId?.ToString("N") ?? "latest";
        var fileName = $"experiment-export-{sessionId}{ExperimentReplayExportFormats.GetFileExtension(format)}";

        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = ExperimentReplayExportFormats.GetContentType(format);
        HttpContext.Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        await HttpContext.Response.WriteAsync(_serializer.Serialize(exportDocument, format), ct);
    }
}
