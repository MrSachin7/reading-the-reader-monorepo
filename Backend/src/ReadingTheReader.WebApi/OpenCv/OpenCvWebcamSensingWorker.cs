using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using OpenCvSharp;
using OpenCvSharp.Face;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.WebApi.OpenCv;

public sealed class OpenCvWebcamSensingWorker : BackgroundService
{
    private const int LeftEyeStart = 36;
    private const int LeftEyeEnd = 41;
    private const int RightEyeStart = 42;
    private const int RightEyeEnd = 47;
    private const int NoseTipIndex = 30;
    private const int MouthStart = 48;
    private const int MouthEnd = 67;
    private const int ChinIndex = 8;

    private readonly ExperimentSessionManager _sessionManager;
    private readonly IExperimentSessionQueryService _sessionQueryService;
    private readonly OpenCvWebcamSensingOptions _options;
    private readonly string _contentRootPath;
    private VideoCapture? _capture;
    private Mat? _previousGray;
    private Point2f? _previousNoseTip;
    private string _lastStatus = string.Empty;
    private CascadeClassifier? _faceCascade;
    private FacemarkLBF? _facemark;

    public OpenCvWebcamSensingWorker(
        ExperimentSessionManager sessionManager,
        IExperimentSessionQueryService sessionQueryService,
        IHostEnvironment hostEnvironment,
        IOptions<OpenCvWebcamSensingOptions> options)
    {
        _sessionManager = sessionManager;
        _sessionQueryService = sessionQueryService;
        _contentRootPath = hostEnvironment.ContentRootPath;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!_options.Enabled)
                {
                    await PublishStatusAsync(WebcamSensingStatusSnapshot.Default, stoppingToken);
                    await Task.Delay(1_000, stoppingToken);
                    continue;
                }

                var snapshot = _sessionQueryService.GetCurrentSnapshot();
                if (!SensingModes.UsesWebcamFace(snapshot.SensingMode))
                {
                    ReleaseCapture();
                    await PublishStatusAsync(WebcamSensingStatusSnapshot.Default, stoppingToken);
                    await Task.Delay(500, stoppingToken);
                    continue;
                }

                if (!EnsureModels())
                {
                    await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                        false,
                        WebcamSensingStatuses.Unavailable,
                        null,
                        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                        0,
                        1,
                        "OpenCV landmark model files are missing."), stoppingToken);
                    await Task.Delay(1_000, stoppingToken);
                    continue;
                }

                if (!snapshot.IsActive)
                {
                    ReleaseCapture();
                    await PublishStatusAsync(ProbeAvailability(), stoppingToken);
                    await Task.Delay(1_000, stoppingToken);
                    continue;
                }

                if (!EnsureCapture())
                {
                    await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                        false,
                        WebcamSensingStatuses.Unavailable,
                        null,
                        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                        0,
                        1,
                        "Webcam could not be opened."), stoppingToken);
                    await Task.Delay(1_000, stoppingToken);
                    continue;
                }

                using var frame = new Mat();
                if (!_capture!.Read(frame) || frame.Empty())
                {
                    await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                        true,
                        WebcamSensingStatuses.Degraded,
                        null,
                        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                        0,
                        1,
                        "Webcam frame read failed."), stoppingToken);
                    await Task.Delay(_options.FrameIntervalMs, stoppingToken);
                    continue;
                }

                var nowUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                using var gray = new Mat();
                Cv2.CvtColor(frame, gray, ColorConversionCodes.BGR2GRAY);
                Cv2.GaussianBlur(gray, gray, new Size(5, 5), 0);

                var faceRect = DetectPrimaryFace(gray);
                if (!faceRect.HasValue)
                {
                    await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                        true,
                        WebcamSensingStatuses.Degraded,
                        null,
                        nowUnixMs,
                        0,
                        1,
                        "No face detected in webcam frame."), stoppingToken);
                    _previousGray?.Dispose();
                    _previousGray = gray.Clone();
                    _previousNoseTip = null;
                    await Task.Delay(_options.FrameIntervalMs, stoppingToken);
                    continue;
                }

                var landmarks = TryDetectLandmarks(gray, faceRect.Value);
                if (landmarks is null)
                {
                    await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                        true,
                        WebcamSensingStatuses.Degraded,
                        null,
                        nowUnixMs,
                        0,
                        1,
                        "Face detected, but landmark fitting failed."), stoppingToken);
                    _previousGray?.Dispose();
                    _previousGray = gray.Clone();
                    _previousNoseTip = null;
                    await Task.Delay(_options.FrameIntervalMs, stoppingToken);
                    continue;
                }

                var observation = BuildObservation(gray, faceRect.Value, landmarks, nowUnixMs);
                await _sessionManager.UpdateFacialObservationAsync(observation, stoppingToken);

                var difficulty = BuildDifficultySignal(observation, nowUnixMs);
                await _sessionManager.UpdateFacialDifficultySignalAsync(difficulty, stoppingToken);

                if (SensingModes.UsesWebcamGaze(snapshot.SensingMode))
                {
                    await _sessionManager.SubmitWebcamGazeSampleAsync(
                        BuildWebcamGazeSample(gray, landmarks, faceRect.Value, nowUnixMs, observation.CaptureQuality),
                        nowUnixMs,
                        stoppingToken);
                }

                await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                    true,
                    WebcamSensingStatuses.Processing,
                    nowUnixMs,
                    nowUnixMs,
                    observation.CaptureQuality,
                    0,
                    observation.Summary), stoppingToken);

                _previousGray?.Dispose();
                _previousGray = gray.Clone();
                _previousNoseTip = landmarks[NoseTipIndex];
            }
            catch (Exception ex)
            {
                await PublishStatusAsync(new WebcamSensingStatusSnapshot(
                    false,
                    WebcamSensingStatuses.Degraded,
                    null,
                    DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    0,
                    1,
                    ex.Message), stoppingToken);
            }

            await Task.Delay(Math.Max(_options.FrameIntervalMs, 100), stoppingToken);
        }
    }

    public override void Dispose()
    {
        ReleaseCapture();
        _faceCascade?.Dispose();
        _faceCascade = null;
        _facemark?.Dispose();
        _facemark = null;
        base.Dispose();
    }

    private bool EnsureModels()
    {
        if (_faceCascade is not null && _facemark is not null)
        {
            return true;
        }

        var cascadePath = ResolveModelPath(
            _options.FaceCascadePath,
            Path.Combine(_contentRootPath, "OpenCv", "Models", "haarcascade_frontalface_default.xml"),
            Path.Combine(AppContext.BaseDirectory, "OpenCv", "Models", "haarcascade_frontalface_default.xml"));
        var landmarkPath = ResolveModelPath(
            _options.LandmarkModelPath,
            Path.Combine(_contentRootPath, "OpenCv", "Models", "lbfmodel.yaml"),
            Path.Combine(AppContext.BaseDirectory, "OpenCv", "Models", "lbfmodel.yaml"));

        if (cascadePath is null || landmarkPath is null)
        {
            return false;
        }

        _faceCascade?.Dispose();
        _faceCascade = new CascadeClassifier(cascadePath);
        if (_faceCascade.Empty())
        {
            _faceCascade.Dispose();
            _faceCascade = null;
            return false;
        }

        _facemark?.Dispose();
        _facemark = FacemarkLBF.Create();
        _facemark.LoadModel(landmarkPath);
        return true;
    }

    private bool EnsureCapture()
    {
        if (_capture is not null && _capture.IsOpened())
        {
            return true;
        }

        ReleaseCapture();
        _capture = new VideoCapture(_options.CameraIndex);
        return _capture.IsOpened();
    }

    private WebcamSensingStatusSnapshot ProbeAvailability()
    {
        try
        {
            using var probe = new VideoCapture(_options.CameraIndex);
            if (!probe.IsOpened())
            {
                return new WebcamSensingStatusSnapshot(
                    false,
                    WebcamSensingStatuses.Unavailable,
                    null,
                    DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    0,
                    1,
                    "Webcam could not be opened.");
            }

            return new WebcamSensingStatusSnapshot(
                true,
                WebcamSensingStatuses.Idle,
                null,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                0,
                0,
                "Webcam ready.");
        }
        catch (Exception ex)
        {
            return new WebcamSensingStatusSnapshot(
                false,
                WebcamSensingStatuses.Unavailable,
                null,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                0,
                1,
                ex.Message);
        }
    }

    private void ReleaseCapture()
    {
        _capture?.Release();
        _capture?.Dispose();
        _capture = null;
        _previousGray?.Dispose();
        _previousGray = null;
        _previousNoseTip = null;
    }

    private async Task PublishStatusAsync(WebcamSensingStatusSnapshot status, CancellationToken ct)
    {
        var normalized = status.Copy();
        if (string.Equals(_lastStatus, $"{normalized.Status}:{normalized.Detail}", StringComparison.Ordinal))
        {
            return;
        }

        _lastStatus = $"{normalized.Status}:{normalized.Detail}";
        await _sessionManager.UpdateWebcamSensingStatusAsync(normalized, ct);
    }

    private Rect? DetectPrimaryFace(Mat gray)
    {
        if (_faceCascade is null)
        {
            return null;
        }

        var faces = _faceCascade.DetectMultiScale(
            gray,
            scaleFactor: 1.1,
            minNeighbors: 3,
            flags: HaarDetectionTypes.ScaleImage,
            minSize: new Size(80, 80));

        return faces
            .OrderByDescending(face => face.Width * face.Height)
            .Cast<Rect?>()
            .FirstOrDefault();
    }

    private Point2f[]? TryDetectLandmarks(Mat gray, Rect faceRect)
    {
        if (_facemark is null)
        {
            return null;
        }

        using var faceInput = InputArray.Create([faceRect]);
        if (!_facemark.Fit(gray, faceInput, out var landmarks) || landmarks.Length == 0 || landmarks[0].Length == 0)
        {
            return null;
        }

        return landmarks[0];
    }

    private FacialObservationSnapshot BuildObservation(Mat gray, Rect faceRect, Point2f[] landmarks, long capturedAtUnixMs)
    {
        using var faceRegion = new Mat(gray, faceRect);
        using var laplacian = new Mat();
        Cv2.Laplacian(faceRegion, laplacian, MatType.CV_64F);
        Cv2.MeanStdDev(laplacian, out _, out var std);

        var quality = NormalizeVariance(std.Val0 * std.Val0);
        var leftEyeOpenness = ComputeEyeOpenness(landmarks, LeftEyeStart);
        var rightEyeOpenness = ComputeEyeOpenness(landmarks, RightEyeStart);
        var blinkLikelihood = 1d - ((leftEyeOpenness + rightEyeOpenness) / 2d);
        var mouthTension = ComputeMouthTension(landmarks);
        var motionScore = ComputeMotionScore(landmarks[NoseTipIndex], faceRect);
        var faceCenter = new Point2f(faceRect.X + faceRect.Width / 2f, faceRect.Y + faceRect.Height / 2f);
        var headOffsetX = Math.Clamp((landmarks[NoseTipIndex].X - faceCenter.X) / Math.Max(faceRect.Width / 2d, 1d), -1, 1);
        var headOffsetY = Math.Clamp((landmarks[NoseTipIndex].Y - faceCenter.Y) / Math.Max(faceRect.Height / 2d, 1d), -1, 1);
        var confidence = Math.Clamp((quality * 0.45d) + (((leftEyeOpenness + rightEyeOpenness) / 2d) * 0.35d) + ((1d - motionScore) * 0.2d), 0, 1);

        return new FacialObservationSnapshot(
            capturedAtUnixMs,
            landmarks.Length,
            headOffsetX,
            headOffsetY,
            leftEyeOpenness,
            rightEyeOpenness,
            blinkLikelihood,
            mouthTension,
            motionScore,
            quality,
            confidence,
            $"landmarks {landmarks.Length}, quality {quality:0.00}, blink {blinkLikelihood:0.00}, mouth {mouthTension:0.00}");
    }

    private static FacialDifficultySignalSnapshot BuildDifficultySignal(FacialObservationSnapshot observation, long observedAtUnixMs)
    {
        var cues = new List<string>();
        var state = FacialDifficultyStates.Neutral;

        if (observation.BlinkLikelihood >= 0.7)
        {
            cues.Add("blink-rate-up");
        }

        if (observation.MotionScore >= 0.28)
        {
            cues.Add("head-motion");
        }

        if (observation.MouthTension >= 0.52)
        {
            cues.Add("mouth-tension");
        }

        if (Math.Abs(observation.HeadOffsetX) >= 0.42 || Math.Abs(observation.HeadOffsetY) >= 0.42)
        {
            cues.Add("off-center-face");
        }

        if (cues.Count > 0)
        {
            state = FacialDifficultyStates.PossibleStruggle;
        }
        else if (observation.BlinkLikelihood < 0.26 && observation.MotionScore < 0.1 && observation.MouthTension < 0.22)
        {
            state = FacialDifficultyStates.PossibleEase;
            cues.Add("steady-face");
            cues.Add("low-motion");
        }

        return new FacialDifficultySignalSnapshot(
            state,
            Math.Clamp((observation.Confidence * 0.7d) + ((Math.Min(cues.Count, 3) / 3d) * 0.3d), 0, 1),
            observedAtUnixMs,
            cues,
            cues.Count == 0 ? "No strong landmark-derived cue." : string.Join(", ", cues));
    }

    private static GazeData BuildWebcamGazeSample(Mat gray, Point2f[] landmarks, Rect faceRect, long capturedAtUnixMs, double quality)
    {
        var left = LocateDarkPoint(gray, landmarks, LeftEyeStart, LeftEyeEnd, faceRect);
        var right = LocateDarkPoint(gray, landmarks, RightEyeStart, RightEyeEnd, faceRect);
        var validity = quality >= 0.15 ? "Valid" : "Invalid";

        return new GazeData
        {
            DeviceTimeStamp = capturedAtUnixMs * 1000,
            SystemTimeStamp = capturedAtUnixMs * 1000,
            LeftEyeX = (float)left.x,
            LeftEyeY = (float)left.y,
            LeftEyeValidity = validity,
            RightEyeX = (float)right.x,
            RightEyeY = (float)right.y,
            RightEyeValidity = validity,
            LeftPupilDiameterMm = (float?)(2.5 + (1 - quality)),
            LeftPupilValidity = validity,
            RightPupilDiameterMm = (float?)(2.5 + (1 - quality)),
            RightPupilValidity = validity
        };
    }

    private static (double x, double y) LocateDarkPoint(Mat gray, Point2f[] landmarks, int start, int end, Rect faceRect)
    {
        var region = BuildBoundingRect(landmarks, start, end, faceRect);
        using var eyeRegion = new Mat(gray, region);
        Cv2.MinMaxLoc(eyeRegion, out _, out _, out var minLoc, out _);
        var x = (region.X + minLoc.X) / (double)Math.Max(gray.Width, 1);
        var y = (region.Y + minLoc.Y) / (double)Math.Max(gray.Height, 1);
        return (Math.Clamp(x, 0, 1), Math.Clamp(y, 0, 1));
    }

    private double ComputeMotionScore(Point2f noseTip, Rect faceRect)
    {
        if (!_previousNoseTip.HasValue)
        {
            return 0;
        }

        var distance = Math.Sqrt(
            Math.Pow(noseTip.X - _previousNoseTip.Value.X, 2) +
            Math.Pow(noseTip.Y - _previousNoseTip.Value.Y, 2));
        var scale = Math.Max(Math.Min(faceRect.Width, faceRect.Height), 1);
        return Math.Clamp(distance / scale, 0, 1);
    }

    private static double ComputeEyeOpenness(Point2f[] landmarks, int startIndex)
    {
        var width = Distance(landmarks[startIndex], landmarks[startIndex + 3]);
        var opennessA = Distance(landmarks[startIndex + 1], landmarks[startIndex + 5]);
        var opennessB = Distance(landmarks[startIndex + 2], landmarks[startIndex + 4]);
        if (width <= 0.0001d)
        {
            return 0;
        }

        return Math.Clamp(((opennessA + opennessB) / (2d * width)) * 3.2d, 0, 1);
    }

    private static double ComputeMouthTension(Point2f[] landmarks)
    {
        var width = Distance(landmarks[48], landmarks[54]);
        var opening = Distance(landmarks[51], landmarks[57]);
        if (width <= 0.0001d)
        {
            return 0;
        }

        var opennessRatio = Math.Clamp(opening / width, 0, 1);
        return Math.Clamp(1d - (opennessRatio * 2.2d), 0, 1);
    }

    private static Rect BuildBoundingRect(Point2f[] landmarks, int start, int end, Rect faceRect)
    {
        var points = landmarks.Skip(start).Take(end - start + 1).ToArray();
        var minX = points.Min(point => point.X);
        var minY = points.Min(point => point.Y);
        var maxX = points.Max(point => point.X);
        var maxY = points.Max(point => point.Y);
        var padX = Math.Max((maxX - minX) * 0.25f, 2f);
        var padY = Math.Max((maxY - minY) * 0.6f, 2f);

        var x = (int)Math.Max(faceRect.X, Math.Floor(minX - padX));
        var y = (int)Math.Max(faceRect.Y, Math.Floor(minY - padY));
        var right = (int)Math.Min(faceRect.Right, Math.Ceiling(maxX + padX));
        var bottom = (int)Math.Min(faceRect.Bottom, Math.Ceiling(maxY + padY));

        return new Rect(
            x,
            y,
            Math.Max(right - x, 1),
            Math.Max(bottom - y, 1));
    }

    private static double Distance(Point2f left, Point2f right)
    {
        var dx = left.X - right.X;
        var dy = left.Y - right.Y;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }

    private static double NormalizeVariance(double variance)
    {
        return Math.Clamp(variance / 2_500d, 0, 1);
    }

    private static string? ResolveModelPath(string? configuredPath, params string[] candidates)
    {
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            var absoluteConfigured = Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.GetFullPath(configuredPath);
            if (File.Exists(absoluteConfigured))
            {
                return absoluteConfigured;
            }
        }

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }
}
