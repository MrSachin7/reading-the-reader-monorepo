namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface ICalibrationService
{
    CalibrationSessionSnapshot GetCurrentSnapshot();
    CalibrationSettingsSnapshot GetSettings();

    Task<CalibrationSessionSnapshot> StartCalibrationAsync(CancellationToken ct = default);

    Task<CalibrationSessionSnapshot> CollectPointAsync(string pointId, CancellationToken ct = default);

    Task<CalibrationSessionSnapshot> FinishCalibrationAsync(CancellationToken ct = default);

    Task<CalibrationSessionSnapshot> CancelCalibrationAsync(CancellationToken ct = default);

    Task<CalibrationSettingsSnapshot> UpdateSettingsAsync(int presetPointCount, CancellationToken ct = default);
}
