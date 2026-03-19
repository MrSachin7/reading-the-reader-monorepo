using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentReplayExportSerializer
{
    string Serialize(ExperimentReplayExport exportDocument, string format);

    ExperimentReplayExport Deserialize(string content, string format);
}
