using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IReadingMaterialSetupStoreAdapter
{
    ValueTask<ReadingMaterialSetup> SaveAsync(SaveReadingMaterialSetupCommand command, CancellationToken ct = default);
    ValueTask<IReadOnlyCollection<ReadingMaterialSetup>> ListAsync(CancellationToken ct = default);
    ValueTask<ReadingMaterialSetup?> GetByIdAsync(string id, CancellationToken ct = default);
    ValueTask<ReadingMaterialSetup?> UpdateAsync(UpdateReadingMaterialSetupCommand command, CancellationToken ct = default);
}
