namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IExperimentSessionQueryService
{
    ExperimentSessionSnapshot GetCurrentSnapshot();

    ValueTask<ExperimentReplayExport?> GetLatestReplayExportAsync(CancellationToken ct = default);

    ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedReplayExportsAsync(CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> GetSavedReplayExportByIdAsync(string id, CancellationToken ct = default);
}
