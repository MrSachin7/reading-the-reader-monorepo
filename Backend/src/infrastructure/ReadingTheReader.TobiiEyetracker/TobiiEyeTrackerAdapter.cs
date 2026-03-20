#if WINDOWS
using Tobii.Research;
#endif
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.TobiiEyetracker;

public class TobiiEyeTrackerAdapter : IEyeTrackerAdapter
{
    private const int ValidationTargetSampleCount = 30;
    private const int ValidationMinimumSampleCount = 10;
    private const int ValidationTimeoutMilliseconds = 1000;
    private const double GoodAccuracyDegrees = 0.5d;
    private const double GoodPrecisionDegrees = 0.3d;
    private const double PassAccuracyDegrees = 1.0d;
    private const double PassPrecisionDegrees = 0.5d;

    public event EventHandler<GazeData>? GazeDataReceived;

#if WINDOWS
    private IEyeTracker? _selectedTracker;
    private ScreenBasedCalibration? _activeCalibration;
    private ValidationCaptureSession? _activeValidation;
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
        {
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));
        }

        if (licenseFileBytes.Length == 0)
        {
            throw new ArgumentException("A non-empty license file is required.", nameof(licenseFileBytes));
        }

        var found = EyeTrackingOperations.FindAllEyeTrackers();
        var selected = found.FirstOrDefault(t =>
            t.SerialNumber.Equals(serialNumber, StringComparison.OrdinalIgnoreCase));

        if (selected is null)
        {
            throw new ArgumentException($"No eye tracker found with serial number '{serialNumber}'.", nameof(serialNumber));
        }

        try
        {
            var licenseKey = new LicenseKey(licenseFileBytes);
            var licenseCollection = new LicenseCollection([licenseKey]);
            selected.TryApplyLicenses(licenseCollection, out var result);

            var hasInvalidLicense = result is not null &&
                                    result.Any(r => r.ValidationResult != LicenseValidationResult.Ok);

            if (hasInvalidLicense)
            {
                throw new ArgumentException("The provided license is not valid for the selected eye tracker.");
            }
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
        _activeValidation = null;
        return Task.CompletedTask;
    }

    public Task StartEyeTracking()
    {
        if (_selectedTracker is null)
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting.");
        }

        if (_activeCalibration is not null)
        {
            throw new InvalidOperationException("Calibration is active. Leave calibration mode before starting gaze streaming.");
        }

        if (_activeValidation is not null)
        {
            throw new InvalidOperationException("Validation is active. Leave validation mode before starting gaze streaming.");
        }

        if (_isTracking)
        {
            return Task.CompletedTask;
        }

        _selectedTracker.GazeDataReceived += OnTobiiGazeDataReceived;
        _isTracking = true;
        Console.WriteLine($"Tobii eye tracking started on '{_selectedTracker.Address}'");
        return Task.CompletedTask;
    }

    public void StopEyeTracking()
    {
        if (_selectedTracker is null || !_isTracking)
        {
            return;
        }

        _selectedTracker.GazeDataReceived -= OnTobiiGazeDataReceived;
        _isTracking = false;
        Console.WriteLine("Tobii eye tracking stopped");
    }

    public async Task BeginCalibrationAsync(CancellationToken ct = default)
    {
        if (_selectedTracker is null)
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting calibration.");
        }

        if (_isTracking)
        {
            throw new InvalidOperationException("Stop gaze streaming before starting calibration.");
        }

        if (_activeValidation is not null)
        {
            throw new InvalidOperationException("Leave validation mode before starting a new calibration.");
        }

        await CancelCalibrationAsync(ct);

        _activeCalibration = new ScreenBasedCalibration(_selectedTracker);
        await _activeCalibration.EnterCalibrationModeAsync();
        Console.WriteLine($"Tobii calibration mode entered on '{_selectedTracker.Address}'");
    }

    public async Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeCalibration is null)
        {
            throw new InvalidOperationException("Calibration mode is not active.");
        }

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
        {
            throw new InvalidOperationException("Calibration mode is not active.");
        }

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
            ? ["Calibration applied on the eye tracker."]
            : [$"Compute and apply returned '{status}'."];

        return new CalibrationComputeResult(status, applied, result.CalibrationPoints.Count, acceptedPoints, notes);
    }

    public Task BeginValidationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_selectedTracker is null)
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting validation.");
        }

        if (_activeCalibration is not null)
        {
            throw new InvalidOperationException("Leave calibration mode before starting validation.");
        }

        if (_isTracking)
        {
            throw new InvalidOperationException("Stop gaze streaming before starting validation.");
        }

        var displayArea = _selectedTracker.GetDisplayArea();
        _activeValidation = new ValidationCaptureSession(displayArea, []);
        Console.WriteLine($"Tobii validation mode entered on '{_selectedTracker.Address}'");
        return Task.CompletedTask;
    }

    public async Task<CalibrationValidationCollectionResult> CollectValidationDataAsync(float x, float y, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_selectedTracker is null || _activeValidation is null)
        {
            throw new InvalidOperationException("Validation mode is not active.");
        }

        var targetPoint = new NormalizedPoint2D(x, y);
        var samples = await CaptureValidationSamplesAsync(_selectedTracker, targetPoint, ct);
        var existingIndex = _activeValidation.Points.FindIndex(point =>
            Math.Abs(point.TargetPoint.X - targetPoint.X) < 0.0001f &&
            Math.Abs(point.TargetPoint.Y - targetPoint.Y) < 0.0001f);

        if (existingIndex >= 0)
        {
            _activeValidation.Points.RemoveAt(existingIndex);
        }

        _activeValidation.Points.Add(new ValidationPointCapture(targetPoint, samples));

        if (samples.Count < ValidationMinimumSampleCount)
        {
            return new CalibrationValidationCollectionResult(
                "TooFewSamples",
                false,
                samples.Count,
                [$"Only {samples.Count} usable gaze samples were captured. Keep the participant steady and try again."]);
        }

        var notes = new List<string>
        {
            $"Captured {samples.Count} usable gaze samples for validation."
        };

        if (samples.Count < ValidationTargetSampleCount)
        {
            notes.Add($"Target sample count was {ValidationTargetSampleCount}, but the timeout ended first.");
        }

        return new CalibrationValidationCollectionResult("Success", true, samples.Count, notes);
    }

    public Task<CalibrationValidationResult> ComputeValidationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeValidation is null)
        {
            throw new InvalidOperationException("Validation mode is not active.");
        }

        if (_activeValidation.Points.Count == 0)
        {
            throw new InvalidOperationException("No validation samples have been collected.");
        }

        var pointResults = _activeValidation.Points
            .Select(point => BuildValidationPointResult(_activeValidation.DisplayArea, point))
            .ToArray();
        var averageAccuracy = Average(pointResults.Select(point => point.AverageAccuracyDegrees));
        var averagePrecision = Average(pointResults.Select(point => point.AveragePrecisionDegrees));
        var passedPoints = pointResults.Count(point =>
            string.Equals(point.Quality, "good", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(point.Quality, "fair", StringComparison.OrdinalIgnoreCase));
        var minimumPassedPoints = Math.Max(1, (int)Math.Ceiling(pointResults.Length * 0.8d));
        var passed = averageAccuracy.HasValue &&
                     averagePrecision.HasValue &&
                     averageAccuracy.Value <= PassAccuracyDegrees &&
                     averagePrecision.Value <= PassPrecisionDegrees &&
                     passedPoints >= minimumPassedPoints;
        var quality = passed
            ? EvaluateQuality(averageAccuracy, averagePrecision)
            : "poor";
        var notes = passed
            ? new List<string>
            {
                "Validation passed.",
                $"Average accuracy {averageAccuracy:0.00} degrees and precision {averagePrecision:0.00} degrees."
            }
            : new List<string>
            {
                "Validation quality is below the required threshold.",
                averageAccuracy.HasValue && averagePrecision.HasValue
                    ? $"Average accuracy {averageAccuracy:0.00} degrees and precision {averagePrecision:0.00} degrees."
                    : "At least one validation point did not produce enough data."
            };

        return Task.FromResult(new CalibrationValidationResult(
            passed,
            quality,
            averageAccuracy,
            averagePrecision,
            pointResults.Sum(point => point.SampleCount),
            pointResults,
            notes));
    }

    public async Task CancelCalibrationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeCalibration is null)
        {
            return;
        }

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

    public Task CancelValidationAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_activeValidation is not null)
        {
            Console.WriteLine("Tobii validation mode left");
        }

        _activeValidation = null;
        return Task.CompletedTask;
    }

    private async Task<List<ValidationEyeSample>> CaptureValidationSamplesAsync(
        IEyeTracker tracker,
        NormalizedPoint2D targetPoint,
        CancellationToken ct)
    {
        var samples = new List<ValidationEyeSample>();
        var gate = new object();

        void Handler(object? sender, GazeDataEventArgs args)
        {
            lock (gate)
            {
                TryAddValidationSample(samples, targetPoint, args.LeftEye, args.DeviceTimeStamp, "left");
                TryAddValidationSample(samples, targetPoint, args.RightEye, args.DeviceTimeStamp, "right");
            }
        }

        tracker.GazeDataReceived += Handler;
        try
        {
            var startedAt = DateTime.UtcNow;
            while (true)
            {
                ct.ThrowIfCancellationRequested();

                int count;
                lock (gate)
                {
                    count = samples.Count;
                }

                if (count >= ValidationTargetSampleCount)
                {
                    break;
                }

                if ((DateTime.UtcNow - startedAt).TotalMilliseconds >= ValidationTimeoutMilliseconds)
                {
                    break;
                }

                await Task.Delay(20, ct);
            }
        }
        finally
        {
            tracker.GazeDataReceived -= Handler;
        }

        lock (gate)
        {
            return [.. samples];
        }
    }

    private static void TryAddValidationSample(
        ICollection<ValidationEyeSample> samples,
        NormalizedPoint2D targetPoint,
        EyeData eyeData,
        long deviceTimestamp,
        string eyeLabel)
    {
        if (eyeData.GazePoint.Validity != Validity.Valid ||
            eyeData.GazeOrigin.Validity != Validity.Valid)
        {
            return;
        }

        samples.Add(new ValidationEyeSample(
            targetPoint,
            eyeData.GazePoint.PositionOnDisplayArea,
            eyeData.GazePoint.PositionInUserCoordinates,
            eyeData.GazeOrigin.PositionInUserCoordinates,
            deviceTimestamp,
            eyeLabel));
    }

    private static CalibrationValidationPointResult BuildValidationPointResult(
        DisplayArea displayArea,
        ValidationPointCapture capture)
    {
        var targetPoint3D = ToUserCoordinates(displayArea, capture.TargetPoint);
        var leftEyeSamples = capture.Samples
            .Where(sample => string.Equals(sample.EyeLabel, "left", StringComparison.OrdinalIgnoreCase))
            .OrderBy(sample => sample.DeviceTimestamp)
            .ToArray();
        var rightEyeSamples = capture.Samples
            .Where(sample => string.Equals(sample.EyeLabel, "right", StringComparison.OrdinalIgnoreCase))
            .OrderBy(sample => sample.DeviceTimestamp)
            .ToArray();

        var leftAccuracy = Average(leftEyeSamples.Select(sample => CalculateAngularAccuracyDegrees(sample, targetPoint3D)));
        var rightAccuracy = Average(rightEyeSamples.Select(sample => CalculateAngularAccuracyDegrees(sample, targetPoint3D)));
        var leftPrecision = CalculatePrecisionDegrees(leftEyeSamples);
        var rightPrecision = CalculatePrecisionDegrees(rightEyeSamples);
        var averageAccuracy = Average([leftAccuracy, rightAccuracy]);
        var averagePrecision = Average([leftPrecision, rightPrecision]);
        var quality = EvaluateQuality(averageAccuracy, averagePrecision);

        var notes = new List<string>();
        if (!leftAccuracy.HasValue || !rightAccuracy.HasValue)
        {
            notes.Add("Only one eye produced usable validation samples for this point.");
        }

        if (capture.Samples.Count < ValidationTargetSampleCount)
        {
            notes.Add($"Collected {capture.Samples.Count} usable eye samples.");
        }

        return new CalibrationValidationPointResult(
            BuildValidationPointId(capture.TargetPoint),
            BuildValidationPointLabel(capture.TargetPoint),
            capture.TargetPoint.X,
            capture.TargetPoint.Y,
            averageAccuracy,
            averagePrecision,
            capture.Samples.Count,
            quality,
            notes);
    }

    private static string EvaluateQuality(double? averageAccuracyDegrees, double? averagePrecisionDegrees)
    {
        if (!averageAccuracyDegrees.HasValue || !averagePrecisionDegrees.HasValue)
        {
            return "poor";
        }

        if (averageAccuracyDegrees.Value <= GoodAccuracyDegrees &&
            averagePrecisionDegrees.Value <= GoodPrecisionDegrees)
        {
            return "good";
        }

        if (averageAccuracyDegrees.Value <= PassAccuracyDegrees &&
            averagePrecisionDegrees.Value <= PassPrecisionDegrees)
        {
            return "fair";
        }

        return "poor";
    }

    private static double? CalculateAngularAccuracyDegrees(ValidationEyeSample sample, Point3D targetPoint3D)
    {
        return CalculateAngleDegrees(
            CreateVector(sample.GazeOrigin, targetPoint3D),
            CreateVector(sample.GazeOrigin, sample.GazePointInUserCoordinates));
    }

    private static double? CalculatePrecisionDegrees(IReadOnlyList<ValidationEyeSample> samples)
    {
        if (samples.Count < 2)
        {
            return null;
        }

        var deltas = new List<double>(samples.Count - 1);
        for (var index = 1; index < samples.Count; index++)
        {
            var previous = samples[index - 1];
            var current = samples[index];
            var delta = CalculateAngleDegrees(
                CreateVector(previous.GazeOrigin, previous.GazePointInUserCoordinates),
                CreateVector(current.GazeOrigin, current.GazePointInUserCoordinates));

            if (delta.HasValue)
            {
                deltas.Add(delta.Value);
            }
        }

        if (deltas.Count == 0)
        {
            return null;
        }

        return Math.Sqrt(deltas.Average(value => value * value));
    }

    private static double? CalculateAngleDegrees(Vector3 from, Vector3 to)
    {
        var fromMagnitude = from.Magnitude;
        var toMagnitude = to.Magnitude;
        if (fromMagnitude <= double.Epsilon || toMagnitude <= double.Epsilon)
        {
            return null;
        }

        var cosine = (from.X * to.X + from.Y * to.Y + from.Z * to.Z) / (fromMagnitude * toMagnitude);
        cosine = Math.Clamp(cosine, -1d, 1d);
        return Math.Acos(cosine) * 180d / Math.PI;
    }

    private static Vector3 CreateVector(Point3D from, Point3D to)
    {
        return new Vector3(to.X - from.X, to.Y - from.Y, to.Z - from.Z);
    }

    private static Point3D ToUserCoordinates(DisplayArea displayArea, NormalizedPoint2D point)
    {
        var topLeft = displayArea.TopLeft;
        var topRight = displayArea.TopRight;
        var bottomLeft = displayArea.BottomLeft;

        return new Point3D(
            topLeft.X + ((topRight.X - topLeft.X) * point.X) + ((bottomLeft.X - topLeft.X) * point.Y),
            topLeft.Y + ((topRight.Y - topLeft.Y) * point.X) + ((bottomLeft.Y - topLeft.Y) * point.Y),
            topLeft.Z + ((topRight.Z - topLeft.Z) * point.X) + ((bottomLeft.Z - topLeft.Z) * point.Y));
    }

    private static double? Average(IEnumerable<double?> values)
    {
        var materialized = values.Where(value => value.HasValue).Select(value => value!.Value).ToArray();
        if (materialized.Length == 0)
        {
            return null;
        }

        return materialized.Average();
    }

    private static string BuildValidationPointId(NormalizedPoint2D point)
    {
        return $"validation-{point.X:0.00}-{point.Y:0.00}";
    }

    private static string BuildValidationPointLabel(NormalizedPoint2D point)
    {
        return $"Point {point.X:0.00}, {point.Y:0.00}";
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
    private bool _isValidationActive;
    private readonly List<CalibrationPointDefinition> _mockValidationPoints = [];

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
        {
            throw new ArgumentException("A serial number is required.", nameof(serialNumber));
        }

        if (licenseFileBytes.Length == 0)
        {
            throw new ArgumentException("A non-empty license file is required.", nameof(licenseFileBytes));
        }

        _isTrackerSelected = true;
        _mockValidationPoints.Clear();
        return Task.CompletedTask;
    }

    public Task StartEyeTracking()
    {
        if (!_isTrackerSelected)
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting.");
        }

        if (_isCalibrationActive)
        {
            throw new InvalidOperationException("Calibration is active. Leave calibration mode before starting gaze streaming.");
        }

        if (_isValidationActive)
        {
            throw new InvalidOperationException("Validation is active. Leave validation mode before starting gaze streaming.");
        }

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
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting calibration.");
        }

        if (_isValidationActive)
        {
            throw new InvalidOperationException("Leave validation mode before starting a new calibration.");
        }

        _isCalibrationActive = true;
        Console.WriteLine("Mock calibration mode entered");
        return Task.CompletedTask;
    }

    public Task<CalibrationCollectionResult> CollectCalibrationDataAsync(float x, float y, CancellationToken ct = default)
    {
        if (!_isCalibrationActive)
        {
            throw new InvalidOperationException("Calibration mode is not active.");
        }

        return Task.FromResult(new CalibrationCollectionResult(
            "Success",
            true,
            1,
            [$"Mock calibration data collected at ({x:0.00}, {y:0.00})."]));
    }

    public Task<CalibrationComputeResult> ComputeAndApplyCalibrationAsync(CancellationToken ct = default)
    {
        if (!_isCalibrationActive)
        {
            throw new InvalidOperationException("Calibration mode is not active.");
        }

        return Task.FromResult(new CalibrationComputeResult(
            "Success",
            true,
            5,
            [],
            ["Mock calibration applied successfully."]));
    }

    public Task BeginValidationAsync(CancellationToken ct = default)
    {
        if (!_isTrackerSelected)
        {
            throw new InvalidOperationException("No eye tracker selected. Select an eye tracker before starting validation.");
        }

        if (_isCalibrationActive)
        {
            throw new InvalidOperationException("Leave calibration mode before starting validation.");
        }

        _isValidationActive = true;
        _mockValidationPoints.Clear();
        Console.WriteLine("Mock validation mode entered");
        return Task.CompletedTask;
    }

    public Task<CalibrationValidationCollectionResult> CollectValidationDataAsync(float x, float y, CancellationToken ct = default)
    {
        if (!_isValidationActive)
        {
            throw new InvalidOperationException("Validation mode is not active.");
        }

        _mockValidationPoints.Add(new CalibrationPointDefinition(
            $"validation-{_mockValidationPoints.Count + 1}",
            $"Validation {_mockValidationPoints.Count + 1}",
            x,
            y));

        return Task.FromResult(new CalibrationValidationCollectionResult(
            "Success",
            true,
            30,
            [$"Mock validation data collected at ({x:0.00}, {y:0.00})."]));
    }

    public Task<CalibrationValidationResult> ComputeValidationAsync(CancellationToken ct = default)
    {
        if (!_isValidationActive)
        {
            throw new InvalidOperationException("Validation mode is not active.");
        }

        var points = _mockValidationPoints.Count == 0
            ? []
            : _mockValidationPoints.Select((point, index) => new CalibrationValidationPointResult(
                point.PointId,
                point.Label,
                point.X,
                point.Y,
                0.42d + (index * 0.03d),
                0.24d + (index * 0.02d),
                30,
                "good",
                ["Mock validation point passed."]))
                .ToArray();

        return Task.FromResult(new CalibrationValidationResult(
            true,
            "good",
            0.48d,
            0.28d,
            points.Sum(point => point.SampleCount),
            points,
            ["Mock validation passed."]));
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

    public Task CancelValidationAsync(CancellationToken ct = default)
    {
        if (_isValidationActive)
        {
            Console.WriteLine("Mock validation mode left");
        }

        _isValidationActive = false;
        _mockValidationPoints.Clear();
        return Task.CompletedTask;
    }
#endif

    private sealed record Vector3(double X, double Y, double Z)
    {
        public double Magnitude => Math.Sqrt((X * X) + (Y * Y) + (Z * Z));
    }

#if WINDOWS
    private sealed class ValidationCaptureSession
    {
        public ValidationCaptureSession(DisplayArea displayArea, List<ValidationPointCapture> points)
        {
            DisplayArea = displayArea;
            Points = points;
        }

        public DisplayArea DisplayArea { get; }

        public List<ValidationPointCapture> Points { get; }
    }

    private sealed record ValidationPointCapture(
        NormalizedPoint2D TargetPoint,
        List<ValidationEyeSample> Samples);

    private sealed record ValidationEyeSample(
        NormalizedPoint2D TargetPoint,
        NormalizedPoint2D GazePointOnDisplayArea,
        Point3D GazePointInUserCoordinates,
        Point3D GazeOrigin,
        long DeviceTimestamp,
        string EyeLabel);
#endif
}
