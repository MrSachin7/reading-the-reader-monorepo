namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentSetupStorageOptions
{
    public const string SectionName = "ExperimentSetupStorage";

    public string DirectoryPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "data", "experiment-setups");
}
