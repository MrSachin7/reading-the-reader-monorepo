using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class EyeTrackerService : IEyeTrackerService
{
    private readonly IExperimentSessionManager _sessionManager;
    private readonly IEyeTrackerAdapter _eyeTrackerAdapter;
    private readonly IEyeTrackerLicenseStoreAdapter _licenseStoreAdapter;

    public EyeTrackerService(
        IExperimentSessionManager sessionManager,
        IEyeTrackerAdapter eyeTrackerAdapter,
        IEyeTrackerLicenseStoreAdapter licenseStoreAdapter)
    {
        _sessionManager = sessionManager;
        _eyeTrackerAdapter = eyeTrackerAdapter;
        _licenseStoreAdapter = licenseStoreAdapter;
    }

    public async Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackersAsync(CancellationToken ct = default)
    {
        var trackers = await _eyeTrackerAdapter.GetAllConnectedEyeTrackers();
        foreach (var tracker in trackers)
        {
            tracker.HasSavedLicence = await _licenseStoreAdapter.HasLicenseAsync(tracker.SerialNumber, ct);
        }

        return trackers;
    }

    public async Task SelectEyeTrackerAsync(
        string serialNumber,
        byte[]? licenseFileBytes,
        bool saveLicence,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("serialNumber is required.", nameof(serialNumber));

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
                throw new ArgumentException("licenceFile is required when no saved licence exists for this eye tracker.");

            effectiveLicenseBytes = storedLicense;
        }

        await _eyeTrackerAdapter.SelectEyeTracker(serialNumber, effectiveLicenseBytes, ct);
        
        var selectedEyeTracker = await ResolveSelectedEyeTrackerAsync(serialNumber, ct);
        await _sessionManager.SetCurrentEyeTrackerAsync(selectedEyeTracker, ct);

        if (saveLicence && hasUploadedLicense)
        {
            await _licenseStoreAdapter.SaveLicenseAsync(serialNumber, effectiveLicenseBytes, ct);
        }
    }

    public Task StartTrackingAsync(CancellationToken ct = default)
    {
        return _sessionManager.StartSessionAsync(ct);
    }

    public Task StopTrackingAsync(CancellationToken ct = default)
    {
        return _sessionManager.StopSessionAsync(ct);
    }

    private async Task<EyeTrackerDevice> ResolveSelectedEyeTrackerAsync(string serialNumber, CancellationToken ct)
    {
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
}
