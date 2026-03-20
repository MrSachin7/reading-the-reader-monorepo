namespace ReadingTheReader.Realtime.Persistence;

public sealed class ReadingMaterialSetupStorageOptions
{
    public const string SectionName = "ReadingMaterialSetupStorage";

    public string DirectoryPath { get; set; } = Path.Combine(
        PersistencePathResolver.GetPersistenceDataDirectory(),
        "reading-material-setups");

    public string ResolveDirectoryPath()
    {
        return string.IsNullOrWhiteSpace(DirectoryPath)
            ? Path.Combine(PersistencePathResolver.GetPersistenceDataDirectory(), "reading-material-setups")
            : PersistencePathResolver.ResolvePath(DirectoryPath);
    }
}
