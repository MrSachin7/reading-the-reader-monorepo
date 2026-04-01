using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public interface IExperimentSessionQueryService
{
    ExperimentSessionSnapshot GetCurrentSnapshot();

    IReadOnlyList<ReadingInterventionModuleDescriptor> GetInterventionModules();

    ValueTask<ExperimentReplayExport?> GetLatestReplayExportAsync(CancellationToken ct = default);

    ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedReplayExportsAsync(CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> GetSavedReplayExportByIdAsync(string id, CancellationToken ct = default);
}
