namespace ReadingTheReader.core.Domain;

public class EyeTrackerDevice
{
    public string Name { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public bool HasSavedLicence { get; set; }

    public EyeTrackerDevice Copy()
    {
        return new EyeTrackerDevice
        {
            Name = Name,
            Model = Model,
            SerialNumber = SerialNumber,
            HasSavedLicence = HasSavedLicence
        };
    }
}
