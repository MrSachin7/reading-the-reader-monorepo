namespace ReadingTheReader.core.Domain;

public static class EyeTrackerLicencePolicy
{
    private const string ProFusionModelMarker = "Pro Fusion";

    public static bool RequiresLicence(EyeTrackerDevice? eyeTrackerDevice)
    {
        return RequiresLicence(eyeTrackerDevice?.Model);
    }

    public static bool RequiresLicence(string? model)
    {
        return !IsProEyeTrackerModel(model);
    }

    public static bool IsProEyeTrackerModel(string? model)
    {
        return !string.IsNullOrWhiteSpace(model) &&
               model.Contains(ProFusionModelMarker, StringComparison.OrdinalIgnoreCase);
    }
}
