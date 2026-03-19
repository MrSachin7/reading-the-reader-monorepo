namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

public interface IReadingMaterialSetupService
{
    ValueTask<ReadingMaterialSetup> SaveAsync(SaveReadingMaterialSetupCommand command, CancellationToken ct = default);
    ValueTask<IReadOnlyCollection<ReadingMaterialSetup>> ListAsync(CancellationToken ct = default);
    ValueTask<ReadingMaterialSetup> GetByIdAsync(string id, CancellationToken ct = default);
    ValueTask<ReadingMaterialSetup> UpdateAsync(UpdateReadingMaterialSetupCommand command, CancellationToken ct = default);
}
