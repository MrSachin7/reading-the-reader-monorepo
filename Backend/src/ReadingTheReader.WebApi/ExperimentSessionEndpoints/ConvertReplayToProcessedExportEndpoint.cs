using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using Microsoft.AspNetCore.Http.Features;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class ConvertReplayToProcessedExportEndpoint : EndpointWithoutRequest
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public override void Configure()
    {
        Post("/experiment-session/export/processed/from-replay");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bodySizeFeature = HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (bodySizeFeature is { IsReadOnly: false })
        {
            bodySizeFeature.MaxRequestBodySize = null;
        }

        ExperimentReplayExport? replayExport;
        try
        {
            replayExport = await ReadReplayExportAsync(ct);
        }
        catch (JsonException ex)
        {
            await WriteErrorAsync(StatusCodes.Status400BadRequest,
                $"Could not parse the replay export payload: {ex.Message}", ct);
            return;
        }

        if (replayExport is null)
        {
            await WriteErrorAsync(StatusCodes.Status400BadRequest,
                "Replay export payload is required (send the JSON in the request body or as a 'replay' form file).", ct);
            return;
        }

        if (!string.Equals(replayExport.Manifest?.Schema, ExperimentReplayExportSchema.Name, StringComparison.Ordinal))
        {
            await WriteErrorAsync(StatusCodes.Status400BadRequest,
                $"Expected schema '{ExperimentReplayExportSchema.Name}' but got '{replayExport.Manifest?.Schema}'.", ct);
            return;
        }

        var processedExport = ExperimentProcessedExportFactory.Create(replayExport);

        var sessionId = processedExport.Experiment.SessionId?.ToString("N") ?? "latest";
        var fileName = $"experiment-processed-{sessionId}.json";

        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = "application/json; charset=utf-8";
        HttpContext.Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        await HttpContext.Response.WriteAsync(JsonSerializer.Serialize(processedExport, JsonOptions), ct);
    }

    private async Task<ExperimentReplayExport?> ReadReplayExportAsync(CancellationToken ct)
    {
        if (HttpContext.Request.ContentLength == 0)
        {
            return null;
        }

        return await JsonSerializer.DeserializeAsync<ExperimentReplayExport>(HttpContext.Request.Body, JsonOptions, ct);
    }

    private async Task WriteErrorAsync(int statusCode, string message, CancellationToken ct)
    {
        HttpContext.Response.StatusCode = statusCode;
        await HttpContext.Response.WriteAsJsonAsync(new { message }, ct);
    }
}
