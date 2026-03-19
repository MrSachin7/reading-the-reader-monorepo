namespace ReadingTheReader.core.Domain;

public class EyeTrackerDevice
{
    public string Name { get; set; }
    public string Model { get; set; }
    public string SerialNumber { get; set; }
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
