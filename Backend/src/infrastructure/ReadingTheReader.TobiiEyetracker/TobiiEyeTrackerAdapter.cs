#if WINDOWS
using Tobii.Research;
#endif
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.TobiiEyetracker;

public class TobiiEyeTrackerAdapter : IEyeTrackerAdapter
{
    public event EventHandler<GazeData>? GazeDataReceived;

#if WINDOWS
    private IEyeTracker? _selectedTracker;
    private ScreenBasedCalibration? _activeCalibration;
    private bool _isTracking;

    public Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackers()
    {
        var found = EyeTrackingOperations.FindAllEyeTrackers();
        var devices = found.Select(t => new EyeTrackerDevice
        {
            Name = t.DeviceName,
            SerialNumber = t.SerialNumber,
            Model = t.Model
        }).ToList();

        return Task.FromResult(devices);
    }

    public Task SelectEyeTracker(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));

        if (licenseFileBytes.Length == 0)
            throw new ArgumentException("A non-empty license file is required.", nameof(licenseFileBytes));

        var found = EyeTrackingOperations.FindAllEyeTrackers();
        var selected = found.FirstOrDefault(t =>
            t.SerialNumber.Equals(serialNumber, StringComparison.OrdinalIgnoreCase));

        if (selected is null)
            throw new ArgumentException($"No eye tracker found with serial number '{serialNumber}'.", nameof(serialNumber));

        try
        {
            var licenseKey = new LicenseKey(licenseFileBytes);
            var licenseCollection = new LicenseCollection([licenseKey]);
            selected.TryApplyLicenses(licenseCollection, out var result);

            var hasInvalidLicense = result is not null &&
                                    result.Any(r => r.ValidationResult != LicenseValidationResult.Ok);

            if (hasInvalidLicense)
                throw new ArgumentException("The provided license is not valid for the selected eye tracker.");
        }
        catch (ArgumentException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ArgumentException("The provided license is not valid for the selected eye tracker.", ex);
        }

        _selectedTracker = selected;
        return Task.CompletedTask;
    }

    public Task StartEyeTracking()
    {
        if (_selectedTracker is null)
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting.");

        if (_activeCalibration is not null)
            throw new InvalidOperationException("Calibration is active. Leave calibration mode before starting gaze streaming.");

        if (_isTracking)
            return Task.CompletedTask;

        _selectedTracker.GazeDataReceived += OnTobiiGazeDataReceived;
        _isTracking = true;
        Console.WriteLine($"Tobii eye tracking started on '{_selectedTracker.Address}'");
        return Task.CompletedTask;
    }

    public void StopEyeTracking()
    {
        if (_selectedTracker is null || !_isTracking)
            return;

        _selectedTracker.GazeDataReceived -= OnTobiiGazeDataReceived;
        _isTracking = false;
        Console.WriteLine("Tobii eye tracking stopped");
    }

    public async Task BeginCalibrationAsync(CancellationToken ct = default)
    {
        if (_selectedTracker is null)
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting calibration.");

        if (_isTracking)
            throw new InvalidOperationException("Stop gaze streaming before starting calibration.");

        await CancelCalibrationAsync(ct);

        _activeCalibration = new ScreenBasedCalibration(_selectedTracker);
        await _activeCalibration.EnterCalibrationModeAsync();
        Console.WriteLine($"Tobii calibration mode entered on '{_selectedTracker.Address}'");
    }

    public async Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeCalibration is null)
            throw new InvalidOperationException("Calibration mode is not active.");

        var point = new NormalizedPoint2D(x, y);
        var notes = new List<string>();
        var status = await _activeCalibration.CollectDataAsync(point);
        var attempts = 1;

        if (status != CalibrationStatus.Success)
        {
            notes.Add($"First collection attempt returned '{status}'. Retrying once.");
            status = await _activeCalibration.CollectDataAsync(point);
            attempts += 1;
        }

        var succeeded = status == CalibrationStatus.Success;
        if (succeeded)
        {
            notes.Add("Calibration data collected successfully.");
        }
        else
        {
            notes.Add($"Eye tracker returned '{status}' for this point.");
        }

        return new CalibrationCollectionResult(status.ToString(), succeeded, attempts, notes);
    }

    public async Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeCalibration is null)
            throw new InvalidOperationException("Calibration mode is not active.");

        var result = await _activeCalibration.ComputeAndApplyAsync();
        var status = result.Status.ToString();
        var applied = string.Equals(status, "Success", StringComparison.OrdinalIgnoreCase);
        var acceptedPoints = result.CalibrationPoints
            .Select((point, index) => new CalibrationPointDefinition(
                $"accepted-{index + 1}",
                $"Accepted {index + 1}",
                point.PositionOnDisplayArea.X,
                point.PositionOnDisplayArea.Y))
            .ToArray();
        IReadOnlyList<string> notes = applied
            ? new[] { "Calibration applied on the eye tracker." }
            : new[] { $"Compute and apply returned '{status}'." };

        return new CalibrationComputeResult(status, applied, result.CalibrationPoints.Count, acceptedPoints, notes);
    }

    public async Task CancelCalibrationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeCalibration is null)
            return;

        try
        {
            await _activeCalibration.LeaveCalibrationModeAsync();
        }
        catch
        {
            // Dispose the calibration object even if Tobii reports that mode was already left.
        }
        finally
        {
            _activeCalibration.Dispose();
            _activeCalibration = null;
        }
    }

    private void OnTobiiGazeDataReceived(object? sender, GazeDataEventArgs e)
    {
        var gazeData = new GazeData
        {
            DeviceTimeStamp = e.DeviceTimeStamp,
            LeftEyeX = e.LeftEye.GazePoint.PositionOnDisplayArea.X,
            LeftEyeY = e.LeftEye.GazePoint.PositionOnDisplayArea.Y,
            LeftEyeValidity = e.LeftEye.GazePoint.Validity.ToString(),
            RightEyeX = e.RightEye.GazePoint.PositionOnDisplayArea.X,
            RightEyeY = e.RightEye.GazePoint.PositionOnDisplayArea.Y,
            RightEyeValidity = e.RightEye.GazePoint.Validity.ToString()
        };

        gazeData.Sanitize();
        GazeDataReceived?.Invoke(this, gazeData);
    }
#else
    private bool _isTrackerSelected;
    private bool _isCalibrationActive;

    public Task<List<EyeTrackerDevice>> GetAllConnectedEyeTrackers()
    {
        return Task.FromResult(new List<EyeTrackerDevice>
        {
            new()
            {
                Name = "Mock Tobii Eye Tracker",
                SerialNumber = "MOCK-001",
                Model = "Tobii Pro X3-120"
            }
        });
    }

    public Task SelectEyeTracker(string serialNumber, byte[] licenseFileBytes, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));

        if (licenseFileBytes.Length == 0)
            throw new ArgumentException("A non-empty license file is required.", nameof(licenseFileBytes));

        _isTrackerSelected = true;
        return Task.CompletedTask;
    }

    public Task StartEyeTracking()
    {
        if (!_isTrackerSelected)
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting.");

        if (_isCalibrationActive)
            throw new InvalidOperationException("Calibration is active. Leave calibration mode before starting gaze streaming.");

        Console.WriteLine("Tobii SDK not available on this platform. Running mock eye tracker.");
        Console.WriteLine("Mock eye tracking started");
        return Task.CompletedTask;
    }

    public void StopEyeTracking()
    {
        Console.WriteLine("Mock eye tracking stopped");
    }

    public Task BeginCalibrationAsync(CancellationToken ct = default)
    {
        if (!_isTrackerSelected)
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting calibration.");

        _isCalibrationActive = true;
        Console.WriteLine("Mock calibration mode entered");
        return Task.CompletedTask;
    }

    public Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
    {
        if (!_isCalibrationActive)
            throw new InvalidOperationException("Calibration mode is not active.");

        return Task.FromResult(new CalibrationCollectionResult(
            "Success",
            true,
            1,
            [$"Mock calibration data collected at ({x:0.00}, {y:0.00})."]));
    }

    public Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default)
    {
        if (!_isCalibrationActive)
            throw new InvalidOperationException("Calibration mode is not active.");

        return Task.FromResult(new CalibrationComputeResult(
            "Success",
            true,
            5,
            [],
            ["Mock calibration applied successfully."]));
    }

    public Task CancelCalibrationAsync(CancellationToken ct = default)
    {
        if (_isCalibrationActive)
        {
            Console.WriteLine("Mock calibration mode left");
        }

        _isCalibrationActive = false;
        return Task.CompletedTask;
    }
#endif
}
