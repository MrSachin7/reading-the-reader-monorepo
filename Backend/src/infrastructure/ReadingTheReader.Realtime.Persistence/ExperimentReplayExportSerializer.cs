using System.Globalization;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
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
        return ExperimentReplayExportFormats.Normalize(format) switch
        {
            ExperimentReplayExportFormats.Csv => SerializeCsv(exportDocument),
            _ => JsonSerializer.Serialize(exportDocument, _jsonOptions)
        };
    }

    public ExperimentReplayExport Deserialize(string content, string format)
    {
        return ExperimentReplayExportFormats.Normalize(format) switch
        {
            ExperimentReplayExportFormats.Csv => DeserializeCsv(content),
            _ => JsonSerializer.Deserialize<ExperimentReplayExport>(content, _jsonOptions)
                 ?? throw new InvalidDataException("The replay export payload is empty.")
        };
    }

    private string SerializeCsv(ExperimentReplayExport exportDocument)
    {
        var rows = new List<ExperimentReplayCsvRow>
        {
            CreateRow("metadata", exportDocument.Metadata),
            CreateRow("statistics", exportDocument.Statistics),
            CreateRow("initialSnapshot", exportDocument.InitialSnapshot),
            CreateRow("finalSnapshot", exportDocument.FinalSnapshot)
        };

        rows.AddRange(CreateRows("lifecycleEvent", exportDocument.LifecycleEvents));
        rows.AddRange(CreateRows("gazeSample", exportDocument.GazeSamples));
        rows.AddRange(CreateRows("readingSessionState", exportDocument.ReadingSessionStates));
        rows.AddRange(CreateRows("participantViewportEvent", exportDocument.ParticipantViewportEvents));
        rows.AddRange(CreateRows("readingFocusEvent", exportDocument.ReadingFocusEvents));
        rows.AddRange(CreateRows("interventionEvent", exportDocument.InterventionEvents));

        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            NewLine = Environment.NewLine
        });

        csv.WriteRecords(rows);
        return writer.ToString();
    }

    private ExperimentReplayExport DeserializeCsv(string content)
    {
        using var reader = new StringReader(content);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture));
        var rows = csv.GetRecords<ExperimentReplayCsvRow>().ToArray();

        var metadata = DeserializeSingle<ExperimentReplayMetadata>(rows, "metadata");
        var statistics = DeserializeSingle<ExperimentReplayStatistics>(rows, "statistics");
        var initialSnapshot = DeserializeSingle<ExperimentSessionSnapshot>(rows, "initialSnapshot");
        var finalSnapshot = DeserializeSingle<ExperimentSessionSnapshot>(rows, "finalSnapshot");

        return new ExperimentReplayExport(
            metadata,
            statistics,
            initialSnapshot,
            finalSnapshot,
            DeserializeMany<ExperimentLifecycleEventRecord>(rows, "lifecycleEvent"),
            DeserializeMany<GazeSampleRecord>(rows, "gazeSample"),
            DeserializeMany<ReadingSessionStateRecord>(rows, "readingSessionState"),
            DeserializeMany<ParticipantViewportEventRecord>(rows, "participantViewportEvent"),
            DeserializeMany<ReadingFocusEventRecord>(rows, "readingFocusEvent"),
            DeserializeMany<InterventionEventRecord>(rows, "interventionEvent"));
    }

    private ExperimentReplayCsvRow CreateRow<T>(string section, T value, int? index = null)
    {
        return new ExperimentReplayCsvRow
        {
            Section = section,
            Index = index,
            PayloadJson = JsonSerializer.Serialize(value, _jsonOptions)
        };
    }

    private IEnumerable<ExperimentReplayCsvRow> CreateRows<T>(string section, IEnumerable<T>? items)
    {
        if (items is null)
        {
            yield break;
        }

        var index = 0;
        foreach (var item in items)
        {
            yield return CreateRow(section, item, index);
            index += 1;
        }
    }

    private T DeserializeSingle<T>(IEnumerable<ExperimentReplayCsvRow> rows, string section)
    {
        var row = rows.FirstOrDefault(item => string.Equals(item.Section, section, StringComparison.OrdinalIgnoreCase))
                  ?? throw new InvalidDataException($"The CSV export is missing the '{section}' section.");

        return JsonSerializer.Deserialize<T>(row.PayloadJson, _jsonOptions)
               ?? throw new InvalidDataException($"The CSV export contains an invalid '{section}' payload.");
    }

    private IReadOnlyList<T> DeserializeMany<T>(IEnumerable<ExperimentReplayCsvRow> rows, string section)
    {
        return rows
            .Where(item => string.Equals(item.Section, section, StringComparison.OrdinalIgnoreCase))
            .OrderBy(item => item.Index ?? int.MaxValue)
            .Select(item => JsonSerializer.Deserialize<T>(item.PayloadJson, _jsonOptions)
                            ?? throw new InvalidDataException($"The CSV export contains an invalid '{section}' payload."))
            .ToArray();
    }

    private sealed class ExperimentReplayCsvRow
    {
        public string Section { get; set; } = string.Empty;

        public int? Index { get; set; }

        public string PayloadJson { get; set; } = string.Empty;
    }
}
