using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IEyeTrackerService
{
    Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackersAsync(CancellationToken ct = default);

    Task SelectEyeTrackerAsync(
        string serialNumber,
        byte[]? licenseFileBytes,
        bool saveLicence,
        CancellationToken ct = default);

    Task StartTrackingAsync(CancellationToken ct = default);

    Task StopTrackingAsync(CancellationToken ct = default);
}
