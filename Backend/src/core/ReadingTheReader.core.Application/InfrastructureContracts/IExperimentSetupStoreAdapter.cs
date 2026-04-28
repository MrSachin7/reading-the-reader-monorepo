using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentSetupStoreAdapter
{
    ValueTask<ExperimentSetup> SaveAsync(SaveExperimentSetupCommand command, CancellationToken ct = default);
    ValueTask<IReadOnlyCollection<ExperimentSetup>> ListAsync(CancellationToken ct = default);
    ValueTask<ExperimentSetup?> GetByIdAsync(string id, CancellationToken ct = default);
    ValueTask<ExperimentSetup?> UpdateAsync(UpdateExperimentSetupCommand command, CancellationToken ct = default);
}
