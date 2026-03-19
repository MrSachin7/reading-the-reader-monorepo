namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IEyeTrackerLicenseStoreAdapter
{
    Task<bool> HasLicenseAsync(string serialNumber, CancellationToken ct = default);

    Task<byte[]?> GetLicenseAsync(string serialNumber, CancellationToken ct = default);

    Task SaveLicenseAsync(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default);
}
