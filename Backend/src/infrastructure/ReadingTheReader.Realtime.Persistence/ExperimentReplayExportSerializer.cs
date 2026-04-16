using System.Globalization;
using System.Text;
using System.Text.Json;
using CsvHelper;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentReplayExportSerializer : IExperimentReplayExportSerializer
{
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public string Serialize(ExperimentReplayExport exportDocument, string format)
    {
        if (ExperimentReplayExportFormats.Normalize(format) == ExperimentReplayExportFormats.Csv)
        {
            using var writer = new StringWriter(CultureInfo.InvariantCulture);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
            csv.WriteRecords(BuildCsvRows(exportDocument));
            return writer.ToString();
        }

        return JsonSerializer.Serialize(exportDocument, _jsonOptions);
    }

    public ExperimentReplayExport Deserialize(string content, string format)
    {
        if (ExperimentReplayExportFormats.Normalize(format) == ExperimentReplayExportFormats.Csv)
        {
            using var reader = new StringReader(content);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            var rows = csv.GetRecords<ExperimentReplayCsvRow>().ToList();
            var replayJsonRow = rows.FirstOrDefault(
                row => string.Equals(row.RowType, "replay-json", StringComparison.OrdinalIgnoreCase));

            if (string.IsNullOrWhiteSpace(replayJsonRow?.Notes))
            {
                throw new InvalidDataException(
                    "This CSV export does not include the replay payload. Export it again before replaying.");
            }

            string json;
            try
            {
                json = Encoding.UTF8.GetString(Convert.FromBase64String(replayJsonRow.Notes));
            }
            catch (FormatException ex)
            {
                throw new InvalidDataException("The embedded replay payload in this CSV export is invalid.", ex);
            }

            return JsonSerializer.Deserialize<ExperimentReplayExport>(json, _jsonOptions)
                   ?? throw new InvalidDataException("The replay export payload is empty.");
        }

        return JsonSerializer.Deserialize<ExperimentReplayExport>(content, _jsonOptions)
               ?? throw new InvalidDataException("The replay export payload is empty.");
    }

    private IReadOnlyList<ExperimentReplayCsvRow> BuildCsvRows(ExperimentReplayExport exportDocument)
    {
        var sessionId = exportDocument.Experiment.SessionId?.ToString();
        var rows = new List<ExperimentReplayCsvRow>
        {
            new()
            {
                RowType = "replay-json",
                SessionId = sessionId,
                OccurredAtUnixMs = exportDocument.Manifest.ExportedAtUnixMs,
                EventType = "rtr.experiment-export",
                Notes = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(JsonSerializer.Serialize(exportDocument, _jsonOptions)))
            },
            new()
            {
                RowType = "manifest",
                SessionId = sessionId,
                OccurredAtUnixMs = exportDocument.Manifest.ExportedAtUnixMs,
                EventType = exportDocument.Manifest.Schema,
                Source = exportDocument.Manifest.CompletionSource,
                Details = exportDocument.Content.Title,
                Notes = exportDocument.Manifest.ExportProfile
            },
            new()
            {
                RowType = "experiment-metadata",
                SessionId = sessionId,
                OccurredAtUnixMs = exportDocument.Manifest.ExportedAtUnixMs,
                EventType = "screen-resolution",
                PhysicalScreenWidthPx = exportDocument.Experiment.Screen?.PhysicalScreenWidthPx,
                PhysicalScreenHeightPx = exportDocument.Experiment.Screen?.PhysicalScreenHeightPx,
                ScreenWidthPx = exportDocument.Experiment.Screen?.ScreenWidthPx,
                ScreenHeightPx = exportDocument.Experiment.Screen?.ScreenHeightPx,
                DevicePixelRatio = exportDocument.Experiment.Screen?.DevicePixelRatio,
                Details = exportDocument.Experiment.Screen is null
                    ? null
                    : $"{exportDocument.Experiment.Screen.PhysicalScreenWidthPx}x{exportDocument.Experiment.Screen.PhysicalScreenHeightPx}"
            }
        };

        rows.AddRange(exportDocument.Experiment.LifecycleEvents.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "lifecycle",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            EventType = item.EventType,
            Source = item.Source
        }));

        rows.AddRange(exportDocument.Sensing.GazeSamples.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "gaze-sample",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.CapturedAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            LeftGazeX = item.Left?.GazePoint2D.X,
            LeftGazeY = item.Left?.GazePoint2D.Y,
            RightGazeX = item.Right?.GazePoint2D.X,
            RightGazeY = item.Right?.GazePoint2D.Y,
            Notes = $"device:{item.DeviceTimeStampUs}"
        }));

        rows.AddRange(exportDocument.Derived.ViewportEvents.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "viewport",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            ViewportTopPx = item.Viewport.ScrollTopPx,
            ViewportHeightPx = item.Viewport.ViewportHeightPx,
            Notes = item.Viewport.IsConnected ? "connected" : "disconnected"
        }));

        rows.AddRange(exportDocument.Derived.FocusEvents.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "focus",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            TokenId = item.Focus.ActiveTokenId,
            BlockId = item.Focus.ActiveBlockId,
            Notes = item.Focus.IsInsideReadingArea ? "inside-reading-area" : "outside-reading-area"
        }));

        rows.AddRange(exportDocument.Derived.AttentionEvents.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "attention",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            TokenId = item.Summary.CurrentTokenId,
            MetricValue = item.Summary.CurrentTokenDurationMs,
            Details = $"fixated:{item.Summary.FixatedTokenCount}",
            Notes = $"skimmed:{item.Summary.SkimmedTokenCount}"
        }));

        rows.AddRange(exportDocument.Interventions.DecisionProposals.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "decision-proposal",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            EventType = item.Proposal.Status,
            Source = item.Proposal.ExecutionMode,
            Details = item.Proposal.ProviderId,
            Notes = item.Proposal.Rationale
        }));

        rows.AddRange(exportDocument.Interventions.InterventionEvents.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "intervention",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            EventType = item.Intervention.Trigger,
            Source = item.Intervention.Source,
            Details = item.Intervention.ModuleId,
            Notes = item.Intervention.Reason
        }));

        rows.AddRange(exportDocument.Annotations.Select(item => new ExperimentReplayCsvRow
        {
            RowType = "annotation",
            SessionId = sessionId,
            SequenceNumber = item.SequenceNumber,
            OccurredAtUnixMs = item.OccurredAtUnixMs,
            ElapsedSinceStartMs = item.ElapsedSinceStartMs,
            EventType = item.Category,
            Source = item.Author,
            TokenId = item.TargetTokenId,
            BlockId = item.TargetBlockId,
            Notes = item.Note
        }));

        return rows;
    }
}

public sealed class ExperimentReplayCsvRow
{
    public string RowType { get; init; } = string.Empty;
    public string? SessionId { get; init; }
    public long? SequenceNumber { get; init; }
    public long? OccurredAtUnixMs { get; init; }
    public long? ElapsedSinceStartMs { get; init; }
    public string? EventType { get; init; }
    public string? Source { get; init; }
    public string? Details { get; init; }
    public string? TokenId { get; init; }
    public string? BlockId { get; init; }
    public float? LeftGazeX { get; init; }
    public float? LeftGazeY { get; init; }
    public float? RightGazeX { get; init; }
    public float? RightGazeY { get; init; }
    public double? ViewportTopPx { get; init; }
    public double? ViewportHeightPx { get; init; }
    public double? MetricValue { get; init; }
    public int? ScreenWidthPx { get; init; }
    public int? ScreenHeightPx { get; init; }
    public int? PhysicalScreenWidthPx { get; init; }
    public int? PhysicalScreenHeightPx { get; init; }
    public double? DevicePixelRatio { get; init; }
    public string? Notes { get; init; }
}
