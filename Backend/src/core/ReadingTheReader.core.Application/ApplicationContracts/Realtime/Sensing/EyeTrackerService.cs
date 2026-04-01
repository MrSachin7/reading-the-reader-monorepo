using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class EyeTrackerService : IEyeTrackerService
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly ISensingOperations _sensingOperations;

    public EyeTrackerService(
        IExperimentRuntimeAuthority runtimeAuthority,
        ISensingOperations sensingOperations)
    {
        _runtimeAuthority = runtimeAuthority;
        _sensingOperations = sensingOperations;
    }

    public async Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackersAsync(CancellationToken ct = default)
    {
        return await _sensingOperations.GetConnectedEyeTrackersAsync(ct);
    }

    public async Task SelectEyeTrackerAsync(
        string serialNumber,
        byte[]? licenseFileBytes,
        bool saveLicence,
        CancellationToken ct = default)
    {
        var selectedEyeTracker = await _sensingOperations.SelectEyeTrackerAsync(serialNumber, licenseFileBytes, saveLicence, ct);
        await _runtimeAuthority.SetCurrentEyeTrackerAsync(selectedEyeTracker, ct);
    }

    public Task StartTrackingAsync(CancellationToken ct = default)
    {
        return _runtimeAuthority.StartSessionAsync(ct);
    }

    public Task StopTrackingAsync(CancellationToken ct = default)
    {
        return _runtimeAuthority.StopSessionAsync(ct);
    }
}
