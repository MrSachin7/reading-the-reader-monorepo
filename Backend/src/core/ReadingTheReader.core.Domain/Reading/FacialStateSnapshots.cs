namespace ReadingTheReader.core.Domain.Reading;

public static class FacialDifficultyStates
{
    public const string Neutral = "neutral";
    public const string PossibleStruggle = "possible-struggle";
    public const string PossibleEase = "possible-ease";

    public static string Normalize(string? value)
    {
        if (string.Equals(value?.Trim(), PossibleStruggle, StringComparison.OrdinalIgnoreCase))
        {
            return PossibleStruggle;
        }

        if (string.Equals(value?.Trim(), PossibleEase, StringComparison.OrdinalIgnoreCase))
        {
            return PossibleEase;
        }

        return Neutral;
    }
}

public static class WebcamSensingStatuses
{
    public const string Idle = "idle";
    public const string Processing = "processing";
    public const string Degraded = "degraded";
    public const string Unavailable = "unavailable";

    public static string Normalize(string? value)
    {
        if (string.Equals(value?.Trim(), Processing, StringComparison.OrdinalIgnoreCase))
        {
            return Processing;
        }

        if (string.Equals(value?.Trim(), Degraded, StringComparison.OrdinalIgnoreCase))
        {
            return Degraded;
        }

        if (string.Equals(value?.Trim(), Unavailable, StringComparison.OrdinalIgnoreCase))
        {
            return Unavailable;
        }

        return Idle;
    }
}

public static class SensingSignalSources
{
    public const string None = "none";
    public const string Tobii = "tobii";
    public const string Webcam = "webcam";
    public const string Mouse = "mouse";

    public static string Normalize(string? value)
    {
        if (string.Equals(value?.Trim(), Tobii, StringComparison.OrdinalIgnoreCase))
        {
            return Tobii;
        }

        if (string.Equals(value?.Trim(), Webcam, StringComparison.OrdinalIgnoreCase))
        {
            return Webcam;
        }

        if (string.Equals(value?.Trim(), Mouse, StringComparison.OrdinalIgnoreCase))
        {
            return Mouse;
        }

        return None;
    }
}

public sealed record SensingSignalSourcesSnapshot(
    string GazeSource,
    string FaceSource)
{
    public static SensingSignalSourcesSnapshot Default { get; } = new(
        SensingSignalSources.None,
        SensingSignalSources.None);

    public SensingSignalSourcesSnapshot Copy()
    {
        return new SensingSignalSourcesSnapshot(
            SensingSignalSources.Normalize(GazeSource),
            SensingSignalSources.Normalize(FaceSource));
    }
}

public sealed record WebcamSensingStatusSnapshot(
    bool IsConnected,
    string Status,
    long? LastFrameAtUnixMs,
    long? LastProcessedAtUnixMs,
    double CaptureQuality,
    int ConsecutiveFailures,
    string? Detail)
{
    public static WebcamSensingStatusSnapshot Default { get; } = new(
        false,
        WebcamSensingStatuses.Idle,
        null,
        null,
        0,
        0,
        null);

    public WebcamSensingStatusSnapshot Copy()
    {
        return new WebcamSensingStatusSnapshot(
            IsConnected,
            WebcamSensingStatuses.Normalize(Status),
            LastFrameAtUnixMs.HasValue ? Math.Max(LastFrameAtUnixMs.Value, 0) : null,
            LastProcessedAtUnixMs.HasValue ? Math.Max(LastProcessedAtUnixMs.Value, 0) : null,
            Math.Clamp(CaptureQuality, 0, 1),
            Math.Max(ConsecutiveFailures, 0),
            string.IsNullOrWhiteSpace(Detail) ? null : Detail.Trim());
    }
}

public sealed record FacialObservationSnapshot(
    long CapturedAtUnixMs,
    int LandmarkCount,
    double HeadOffsetX,
    double HeadOffsetY,
    double LeftEyeOpenness,
    double RightEyeOpenness,
    double BlinkLikelihood,
    double MouthTension,
    double MotionScore,
    double CaptureQuality,
    double Confidence,
    string? Summary = null)
{
    public FacialObservationSnapshot Copy()
    {
        return new FacialObservationSnapshot(
            Math.Max(CapturedAtUnixMs, 0),
            Math.Max(LandmarkCount, 0),
            Math.Clamp(HeadOffsetX, -1, 1),
            Math.Clamp(HeadOffsetY, -1, 1),
            Math.Clamp(LeftEyeOpenness, 0, 1),
            Math.Clamp(RightEyeOpenness, 0, 1),
            Math.Clamp(BlinkLikelihood, 0, 1),
            Math.Clamp(MouthTension, 0, 1),
            Math.Clamp(MotionScore, 0, 1),
            Math.Clamp(CaptureQuality, 0, 1),
            Math.Clamp(Confidence, 0, 1),
            string.IsNullOrWhiteSpace(Summary) ? null : Summary.Trim());
    }
}

public sealed record FacialDifficultySignalSnapshot(
    string State,
    double Confidence,
    long ObservedAtUnixMs,
    IReadOnlyList<string> Cues,
    string? Summary = null)
{
    public FacialDifficultySignalSnapshot Copy()
    {
        return new FacialDifficultySignalSnapshot(
            FacialDifficultyStates.Normalize(State),
            Math.Clamp(Confidence, 0, 1),
            Math.Max(ObservedAtUnixMs, 0),
            Cues is null ? [] : [.. Cues.Where(cue => !string.IsNullOrWhiteSpace(cue)).Select(cue => cue.Trim())],
            string.IsNullOrWhiteSpace(Summary) ? null : Summary.Trim());
    }
}
