namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IReaderShellSettingsService
{
    ReaderShellSettingsSnapshot GetSettings();

    Task<ReaderShellSettingsSnapshot> UpdateSettingsAsync(
        ReaderShellSettingsSnapshot nextSettings,
        CancellationToken ct = default);
}
