namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;

public static class FacialStateModuleIds
{
    public const string ModuleId = "facial-state";
}

public static class FacialStateModuleProtocolVersions
{
    public const string V1 = "facial-state.v1";
}

public static class FacialStateModuleCapabilityKeys
{
    public const string ProvidesGaze = "providesGaze";
    public const string ProvidesFace = "providesFace";
}

public static class FacialStateInboundMessageTypes
{
    public const string FacialObservation = "facialObservation";
    public const string WebcamStatus = "webcamStatus";
    public const string GazeSample = "gazeSample";
}

public sealed record FacialStateObservationInboundPayload(
    long? CapturedAtUnixMs,
    int? LandmarkCount,
    double? HeadOffsetX,
    double? HeadOffsetY,
    double? LeftEyeOpenness,
    double? RightEyeOpenness,
    double? BlinkLikelihood,
    double? MouthTension,
    double? MotionScore,
    double? CaptureQuality,
    double? Confidence,
    string? Summary);

public sealed record FacialStateWebcamStatusInboundPayload(
    bool? IsConnected,
    string? Status,
    long? LastFrameAtUnixMs,
    long? LastProcessedAtUnixMs,
    double? CaptureQuality,
    int? ConsecutiveFailures,
    string? Detail);

public sealed record FacialStateGazeSampleInboundPayload(
    long? CapturedAtUnixMs,
    double? LeftEyeX,
    double? LeftEyeY,
    string? LeftEyeValidity,
    double? RightEyeX,
    double? RightEyeY,
    string? RightEyeValidity,
    double? LeftPupilDiameter,
    double? RightPupilDiameter);
