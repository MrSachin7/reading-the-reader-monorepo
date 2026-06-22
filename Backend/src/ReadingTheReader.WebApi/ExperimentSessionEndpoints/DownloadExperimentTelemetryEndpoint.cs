using System.Text.Json;
using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class DownloadExperimentTelemetryEndpoint : EndpointWithoutRequest
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public DownloadExperimentTelemetryEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/experiment-session/telemetry");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var telemetryDocument = await _experimentSessionQueryService.GetLatestTelemetryExportAsync(ct);
        if (telemetryDocument is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "No experiment telemetry is available yet."
            }, ct);
            return;
        }

        var sessionId = telemetryDocument.SessionId?.ToString("N") ?? "latest";
        var fileName = $"experiment-telemetry-{sessionId}.json";

        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = "application/json";
        HttpContext.Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        await HttpContext.Response.WriteAsync(JsonSerializer.Serialize(telemetryDocument, JsonOptions), ct);
    }
}
