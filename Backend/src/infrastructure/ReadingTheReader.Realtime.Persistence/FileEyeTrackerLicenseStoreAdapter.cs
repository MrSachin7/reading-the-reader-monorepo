using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileEyeTrackerLicenseStoreAdapter : IEyeTrackerLicenseStoreAdapter
{
    public Task<bool> HasLicenseAsync(string serialNumber, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));

        var filePath = ResolveLicenseFilePath(serialNumber);
        if (!File.Exists(filePath))
            return Task.FromResult(false);

        var fileInfo = new FileInfo(filePath);
        return Task.FromResult(fileInfo.Length > 0);
    }

    public async Task<byte[]?> GetLicenseAsync(string serialNumber, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));

        var filePath = ResolveLicenseFilePath(serialNumber);
        if (!File.Exists(filePath))
        {
            return null;
        }

        return await File.ReadAllBytesAsync(filePath, ct);
    }

    public async Task SaveLicenseAsync(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));

        if (licenseFileBytes.Length == 0)
            throw new ArgumentException("A non-empty license file is required.", nameof(licenseFileBytes));

        var sanitizedSerial = SanitizeFileName(serialNumber);
        if (string.IsNullOrWhiteSpace(sanitizedSerial))
            throw new ArgumentException("The serial number contains invalid file name characters.", nameof(serialNumber));

        var folderPath = ResolveLicenseFolderPath();
        Directory.CreateDirectory(folderPath);

        var filePath = Path.Combine(folderPath, $"{sanitizedSerial}_licence");
        await File.WriteAllBytesAsync(filePath, licenseFileBytes, ct);
    }

    private static string ResolveLicenseFilePath(string serialNumber)
    {
        var sanitizedSerial = SanitizeFileName(serialNumber);
        if (string.IsNullOrWhiteSpace(sanitizedSerial))
            throw new ArgumentException("The serial number contains invalid file name characters.", nameof(serialNumber));

        return Path.Combine(ResolveLicenseFolderPath(), $"{sanitizedSerial}_licence");
    }

    private static string ResolveLicenseFolderPath()
    {
        return PersistencePathResolver.GetLicenseDirectory();
    }

    private static string SanitizeFileName(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var chars = value.Where(c => !invalidChars.Contains(c)).ToArray();
        return new string(chars);
    }
}
