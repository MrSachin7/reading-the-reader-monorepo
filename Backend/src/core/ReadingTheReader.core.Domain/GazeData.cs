namespace ReadingTheReader.core.Domain;

public class GazeData
{
    private const string InvalidValidity = "Invalid";

    public long DeviceTimeStamp { get; set; }
    public long? SystemTimeStamp { get; set; }

    public float LeftEyeX { get; set; }
    public float LeftEyeY { get; set; }
    public string LeftEyeValidity { get; set; } = string.Empty;
    public float? LeftEyePositionInUserX { get; set; }
    public float? LeftEyePositionInUserY { get; set; }
    public float? LeftEyePositionInUserZ { get; set; }
    public float? LeftPupilDiameterMm { get; set; }
    public string LeftPupilValidity { get; set; } = string.Empty;
    public float? LeftGazeOriginInUserX { get; set; }
    public float? LeftGazeOriginInUserY { get; set; }
    public float? LeftGazeOriginInUserZ { get; set; }
    public string LeftGazeOriginValidity { get; set; } = string.Empty;
    public float? LeftGazeOriginInTrackBoxX { get; set; }
    public float? LeftGazeOriginInTrackBoxY { get; set; }
    public float? LeftGazeOriginInTrackBoxZ { get; set; }

    public float RightEyeX { get; set; }
    public float RightEyeY { get; set; }
    public string RightEyeValidity { get; set; } = string.Empty;
    public float? RightEyePositionInUserX { get; set; }
    public float? RightEyePositionInUserY { get; set; }
    public float? RightEyePositionInUserZ { get; set; }
    public float? RightPupilDiameterMm { get; set; }
    public string RightPupilValidity { get; set; } = string.Empty;
    public float? RightGazeOriginInUserX { get; set; }
    public float? RightGazeOriginInUserY { get; set; }
    public float? RightGazeOriginInUserZ { get; set; }
    public string RightGazeOriginValidity { get; set; } = string.Empty;
    public float? RightGazeOriginInTrackBoxX { get; set; }
    public float? RightGazeOriginInTrackBoxY { get; set; }
    public float? RightGazeOriginInTrackBoxZ { get; set; }

    public GazeData Copy()
    {
        var copy = new GazeData
        {
            DeviceTimeStamp = DeviceTimeStamp,
            SystemTimeStamp = SystemTimeStamp,
            LeftEyeX = LeftEyeX,
            LeftEyeY = LeftEyeY,
            LeftEyeValidity = LeftEyeValidity,
            LeftEyePositionInUserX = LeftEyePositionInUserX,
            LeftEyePositionInUserY = LeftEyePositionInUserY,
            LeftEyePositionInUserZ = LeftEyePositionInUserZ,
            LeftPupilDiameterMm = LeftPupilDiameterMm,
            LeftPupilValidity = LeftPupilValidity,
            LeftGazeOriginInUserX = LeftGazeOriginInUserX,
            LeftGazeOriginInUserY = LeftGazeOriginInUserY,
            LeftGazeOriginInUserZ = LeftGazeOriginInUserZ,
            LeftGazeOriginValidity = LeftGazeOriginValidity,
            LeftGazeOriginInTrackBoxX = LeftGazeOriginInTrackBoxX,
            LeftGazeOriginInTrackBoxY = LeftGazeOriginInTrackBoxY,
            LeftGazeOriginInTrackBoxZ = LeftGazeOriginInTrackBoxZ,
            RightEyeX = RightEyeX,
            RightEyeY = RightEyeY,
            RightEyeValidity = RightEyeValidity,
            RightEyePositionInUserX = RightEyePositionInUserX,
            RightEyePositionInUserY = RightEyePositionInUserY,
            RightEyePositionInUserZ = RightEyePositionInUserZ,
            RightPupilDiameterMm = RightPupilDiameterMm,
            RightPupilValidity = RightPupilValidity,
            RightGazeOriginInUserX = RightGazeOriginInUserX,
            RightGazeOriginInUserY = RightGazeOriginInUserY,
            RightGazeOriginInUserZ = RightGazeOriginInUserZ,
            RightGazeOriginValidity = RightGazeOriginValidity,
            RightGazeOriginInTrackBoxX = RightGazeOriginInTrackBoxX,
            RightGazeOriginInTrackBoxY = RightGazeOriginInTrackBoxY,
            RightGazeOriginInTrackBoxZ = RightGazeOriginInTrackBoxZ
        };

        copy.Sanitize();
        return copy;
    }

    public void Sanitize()
    {
        var leftEye = SanitizeEye(LeftEyeX, LeftEyeY, LeftEyeValidity);
        LeftEyeX = leftEye.X;
        LeftEyeY = leftEye.Y;
        LeftEyeValidity = leftEye.Validity;
        LeftEyePositionInUserX = SanitizeNullable(LeftEyePositionInUserX);
        LeftEyePositionInUserY = SanitizeNullable(LeftEyePositionInUserY);
        LeftEyePositionInUserZ = SanitizeNullable(LeftEyePositionInUserZ);
        LeftPupilDiameterMm = SanitizeNullable(LeftPupilDiameterMm);
        LeftPupilValidity = NormalizeValidity(LeftPupilValidity, LeftPupilDiameterMm);
        LeftGazeOriginInUserX = SanitizeNullable(LeftGazeOriginInUserX);
        LeftGazeOriginInUserY = SanitizeNullable(LeftGazeOriginInUserY);
        LeftGazeOriginInUserZ = SanitizeNullable(LeftGazeOriginInUserZ);
        LeftGazeOriginValidity = NormalizeValidity(
            LeftGazeOriginValidity,
            LeftGazeOriginInUserX,
            LeftGazeOriginInUserY,
            LeftGazeOriginInUserZ);
        LeftGazeOriginInTrackBoxX = SanitizeNullable(LeftGazeOriginInTrackBoxX);
        LeftGazeOriginInTrackBoxY = SanitizeNullable(LeftGazeOriginInTrackBoxY);
        LeftGazeOriginInTrackBoxZ = SanitizeNullable(LeftGazeOriginInTrackBoxZ);

        var rightEye = SanitizeEye(RightEyeX, RightEyeY, RightEyeValidity);
        RightEyeX = rightEye.X;
        RightEyeY = rightEye.Y;
        RightEyeValidity = rightEye.Validity;
        RightEyePositionInUserX = SanitizeNullable(RightEyePositionInUserX);
        RightEyePositionInUserY = SanitizeNullable(RightEyePositionInUserY);
        RightEyePositionInUserZ = SanitizeNullable(RightEyePositionInUserZ);
        RightPupilDiameterMm = SanitizeNullable(RightPupilDiameterMm);
        RightPupilValidity = NormalizeValidity(RightPupilValidity, RightPupilDiameterMm);
        RightGazeOriginInUserX = SanitizeNullable(RightGazeOriginInUserX);
        RightGazeOriginInUserY = SanitizeNullable(RightGazeOriginInUserY);
        RightGazeOriginInUserZ = SanitizeNullable(RightGazeOriginInUserZ);
        RightGazeOriginValidity = NormalizeValidity(
            RightGazeOriginValidity,
            RightGazeOriginInUserX,
            RightGazeOriginInUserY,
            RightGazeOriginInUserZ);
        RightGazeOriginInTrackBoxX = SanitizeNullable(RightGazeOriginInTrackBoxX);
        RightGazeOriginInTrackBoxY = SanitizeNullable(RightGazeOriginInTrackBoxY);
        RightGazeOriginInTrackBoxZ = SanitizeNullable(RightGazeOriginInTrackBoxZ);
    }

    private static SanitizedEye SanitizeEye(float x, float y, string validity)
    {
        if (float.IsFinite(x) && float.IsFinite(y))
        {
            return new SanitizedEye(x, y, validity);
        }

        return new SanitizedEye(0f, 0f, InvalidValidity);
    }

    private static float? SanitizeNullable(float? value)
    {
        return value.HasValue && float.IsFinite(value.Value) ? value.Value : null;
    }

    private static string NormalizeValidity(string validity, params float?[] values)
    {
        return values.Any(value => value.HasValue) ? validity : InvalidValidity;
    }

    private readonly record struct SanitizedEye(float X, float Y, string Validity);
}

