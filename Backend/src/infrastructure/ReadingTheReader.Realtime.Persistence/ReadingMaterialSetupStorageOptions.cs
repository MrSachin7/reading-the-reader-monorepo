namespace ReadingTheReader.Realtime.Persistence;

public sealed class ReadingMaterialSetupStorageOptions
{
    public const string SectionName = "ReadingMaterialSetupStorage";

    public string DirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "data", "reading-material-setups");
}
