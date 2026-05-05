namespace ReadingTheReader.WebApi.OpenCv;

public sealed class OpenCvWebcamSensingOptions
{
    public const string SectionName = "OpenCvWebcamSensing";

    public bool Enabled { get; set; } = true;

    public int CameraIndex { get; set; } = 0;

    public int FrameIntervalMs { get; set; } = 200;

    public string? FaceCascadePath { get; set; }

    public string? LandmarkModelPath { get; set; }
}
