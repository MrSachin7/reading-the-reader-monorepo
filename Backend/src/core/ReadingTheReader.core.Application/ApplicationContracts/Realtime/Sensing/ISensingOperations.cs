using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;

public interface ISensingOperations
{
    Task<List<EyeTrackerDevice>> GetConnectedEyeTrackersAsync(CancellationToken ct = default);

    Task<EyeTrackerDevice> SelectEyeTrackerAsync(
        string serialNumber,
        byte[]? licenseFileBytes,
        bool saveLicence,
        CancellationToken ct = default);

    Task StartHardwareTrackingAsync(CancellationToken ct = default);

    Task StopHardwareTrackingAsync(CancellationToken ct = default);

    Task BeginCalibrationAsync(CancellationToken ct = default);

    Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default);

    Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default);

    Task BeginValidationAsync(CancellationToken ct = default);

    Task<CalibrationValidationCollectionResult> CollectValidationDataAsync(float x, float y, CancellationToken ct = default);

    Task<CalibrationValidationResult> ComputeValidationAsync(CancellationToken ct = default);

    Task CancelCalibrationAsync(CancellationToken ct = default);

    Task CancelValidationAsync(CancellationToken ct = default);
}
