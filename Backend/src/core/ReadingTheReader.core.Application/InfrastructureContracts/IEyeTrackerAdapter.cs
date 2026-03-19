using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IEyeTrackerAdapter
{
    event EventHandler<GazeData> GazeDataReceived;

    Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackers();
    
    Task SelectEyeTracker(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default);

    Task StartEyeTracking();

    void StopEyeTracking();

    Task BeginCalibrationAsync(CancellationToken ct = default);

    Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default);

    Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default);

    Task CancelCalibrationAsync(CancellationToken ct = default);
}
