using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentReplayExportStoreAdapter
{
    ValueTask SaveLatestAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> LoadLatestAsync(CancellationToken ct = default);

    ValueTask<SavedExperimentReplayExportSummary> SaveNamedAsync(
        string name,
        string format,
        ExperimentReplayExport exportDocument,
        CancellationToken ct = default);

    ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedAsync(CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> LoadSavedByIdAsync(string id, CancellationToken ct = default);
}
