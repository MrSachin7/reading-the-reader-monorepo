namespace ReadingTheReader.core.Domain;

public class GazeData
{
    private const string InvalidValidity = "Invalid";

    public long DeviceTimeStamp { get; set; }

    public float LeftEyeX { get; set; }
    public float LeftEyeY { get; set; }
    public string LeftEyeValidity { get; set; } = string.Empty;

    public float RightEyeX { get; set; }
    public float RightEyeY { get; set; }
    public string RightEyeValidity { get; set; } = string.Empty;

    public GazeData Copy()
    {
        var copy = new GazeData
        {
            DeviceTimeStamp = DeviceTimeStamp,
            LeftEyeX = LeftEyeX,
            LeftEyeY = LeftEyeY,
            LeftEyeValidity = LeftEyeValidity,
            RightEyeX = RightEyeX,
            RightEyeY = RightEyeY,
            RightEyeValidity = RightEyeValidity
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

        var rightEye = SanitizeEye(RightEyeX, RightEyeY, RightEyeValidity);
        RightEyeX = rightEye.X;
        RightEyeY = rightEye.Y;
        RightEyeValidity = rightEye.Validity;
    }

    private static SanitizedEye SanitizeEye(float x, float y, string validity)
    {
        if (float.IsFinite(x) && float.IsFinite(y))
        {
            return new SanitizedEye(x, y, validity);
        }

        return new SanitizedEye(0f, 0f, InvalidValidity);
    }

    private readonly record struct SanitizedEye(float X, float Y, string Validity);
}

