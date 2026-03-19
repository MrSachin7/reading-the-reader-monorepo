using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentStateStoreAdapter
{
    ValueTask SaveSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default);

    ValueTask<ExperimentSessionSnapshot?> LoadLatestSnapshotAsync(CancellationToken ct = default);
}
