using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class SensingOperations : ISensingOperations
{
    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IEyeTrackerLicenseStoreAdapter _licenseStoreAdapter;

    public SensingOperations(
        IEyeTrackerAdapter eyeTrackerAdapter,
        IEyeTrackerLicenseStoreAdapter licenseStoreAdapter)
    {
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _licenseStoreAdapter = licenseStoreAdapter;
    }

    public async Task<List<EyeTrackerDevice>> GetConnectedEyeTrackersAsync(CancellationToken ct = default)
    {
        var trackers = await _eyeTrackerAdapter.GetAllConnectedEyeTrackers();
        foreach (var tracker in trackers)
        {
            tracker.HasSavedLicence = await _licenseStoreAdapter.HasLicenseAsync(tracker.SerialNumber, ct);
        }

        return trackers;
    }

    public async Task<EyeTrackerDevice> SelectEyeTrackerAsync(
        string serialNumber,
        byte[]? licenseFileBytes,
        bool saveLicence,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
        {
            throw new ArgumentException("serialNumber is required.", nameof(serialNumber));
        }

        var hasUploadedLicense = licenseFileBytes is { Length: > 0 };
        byte[] effectiveLicenseBytes;

        if (hasUploadedLicense)
        {
            effectiveLicenseBytes = licenseFileBytes!;
        }
        else
        {
            var storedLicense = await _licenseStoreAdapter.GetLicenseAsync(serialNumber, ct);
            if (storedLicense is null || storedLicense.Length == 0)
            {
                throw new ArgumentException("licenceFile is required when no saved licence exists for this eye tracker.");
            }

            effectiveLicenseBytes = storedLicense;
        }

        await _eyeTrackerAdapter.SelectEyeTracker(serialNumber, effectiveLicenseBytes, ct);

        if (saveLicence && hasUploadedLicense)
        {
            await _licenseStoreAdapter.SaveLicenseAsync(serialNumber, effectiveLicenseBytes, ct);
        }

        var trackers = await _eyeTrackerAdapter.GetAllConnectedEyeTrackers();
        var selected = trackers.FirstOrDefault(t =>
            t.SerialNumber.Equals(serialNumber, StringComparison.OrdinalIgnoreCase));

        if (selected is not null)
        {
            selected.HasSavedLicence = await _licenseStoreAdapter.HasLicenseAsync(selected.SerialNumber, ct);
            return selected;
        }

        return new EyeTrackerDevice
        {
            SerialNumber = serialNumber,
            Name = serialNumber,
            Model = string.Empty,
            HasSavedLicence = await _licenseStoreAdapter.HasLicenseAsync(serialNumber, ct)
        };
    }

    public Task StartHardwareTrackingAsync(CancellationToken ct = default)
    {
        return _eyeTrackerAdapter.StartEyeTracking();
    }

    public Task StopHardwareTrackingAsync(CancellationToken ct = default)
    {
        _eyeTrackerAdapter.StopEyeTracking();
        return Task.CompletedTask;
    }

    public Task BeginCalibrationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.BeginCalibrationAsync(ct);

    public Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
        => _eyeTrackerAdapter.CollectCalibrationDataAsync(x, y, ct);

    public Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.ComputeAndApplyCalibrationAsync(ct);

    public Task BeginValidationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.BeginValidationAsync(ct);

    public Task<CalibrationValidationCollectionResult> CollectValidationDataAsync(float x, float y, CancellationToken ct = default)
        => _eyeTrackerAdapter.CollectValidationDataAsync(x, y, ct);

    public Task<CalibrationValidationResult> ComputeValidationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.ComputeValidationAsync(ct);

    public Task CancelCalibrationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.CancelCalibrationAsync(ct);

    public Task CancelValidationAsync(CancellationToken ct = default)
        => _eyeTrackerAdapter.CancelValidationAsync(ct);
}
