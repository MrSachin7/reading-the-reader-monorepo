using System.Text.Json;
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
        return JsonSerializer.Serialize(exportDocument, _jsonOptions);
    }

    public ExperimentReplayExport Deserialize(string content, string format)
    {
        return JsonSerializer.Deserialize<ExperimentReplayExport>(content, _jsonOptions)
               ?? throw new InvalidDataException("The replay export payload is empty.");
    }
}
