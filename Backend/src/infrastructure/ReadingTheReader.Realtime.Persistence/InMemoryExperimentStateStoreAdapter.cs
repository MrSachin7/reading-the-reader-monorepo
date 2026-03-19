using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentStateStoreAdapter : IExperimentStateStoreAdapter
{
    private readonly object _gate = new();
    private ExperimentSessionSnapshot? _latest;

    public ValueTask SaveSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
    {
        lock (_gate)
        {
            _latest = snapshot.Copy();
            Console.WriteLine($"Saving snapshot to InMemory : {_latest?.EyeTrackerDevice?.SerialNumber}, {_latest?.Participant?.ToString()}");
        }

        return ValueTask.CompletedTask;
    }
        
    public ValueTask<ExperimentSessionSnapshot?> LoadLatestSnapshotAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            return ValueTask.FromResult(_latest?.Copy());
        }
    }
}
