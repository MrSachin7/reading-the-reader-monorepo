using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public static class RealtimePersistenceModuleInstaller
{
    public static IServiceCollection InstallRealtimePersistenceModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ExperimentPersistenceOptions>(configuration.GetSection(ExperimentPersistenceOptions.SectionName));
        services.Configure<ReadingMaterialSetupStorageOptions>(configuration.GetSection(ReadingMaterialSetupStorageOptions.SectionName));

        var options = configuration.GetSection(ExperimentPersistenceOptions.SectionName).Get<ExperimentPersistenceOptions>()
            ?? new ExperimentPersistenceOptions();
        var readingMaterialSetupOptions = configuration.GetSection(ReadingMaterialSetupStorageOptions.SectionName).Get<ReadingMaterialSetupStorageOptions>()
            ?? new ReadingMaterialSetupStorageOptions();
        var useFileProvider = string.Equals(options.Provider, "File", StringComparison.OrdinalIgnoreCase);

        services.AddSingleton<IExperimentReplayExportSerializer, ExperimentReplayExportSerializer>();

        if (useFileProvider)
        {
            services.AddSingleton(_ => new FileExperimentSessionJournalStoreAdapter(
                options.ResolveSessionJournalDirectoryPath(),
                options.JournalGazeBatchSize));
            services.AddSingleton<IExperimentStateStoreAdapter>(_ => new FileSnapshotExperimentStateStoreAdapter(options.ResolveSnapshotFilePath()));
            services.AddSingleton<IExperimentSessionJournalStoreAdapter>(serviceProvider =>
                serviceProvider.GetRequiredService<FileExperimentSessionJournalStoreAdapter>());
            services.AddSingleton<IExperimentReplayExportStoreAdapter>(serviceProvider =>
                new FileExperimentReplayExportStoreAdapter(
                    options.ResolveReplayExportFilePath(),
                    options.ResolveSavedReplayExportsDirectoryPath(),
                    serviceProvider.GetRequiredService<IExperimentReplayExportSerializer>()));
            services.AddSingleton<IReadingMaterialSetupStoreAdapter>(_ => new FileReadingMaterialSetupStoreAdapter(readingMaterialSetupOptions.ResolveDirectoryPath()));
            services.AddSingleton<ExperimentSessionJournalFlushWorker>(serviceProvider =>
                new ExperimentSessionJournalFlushWorker(
                    serviceProvider.GetRequiredService<FileExperimentSessionJournalStoreAdapter>(),
                    options.JournalGazeFlushIntervalMilliseconds));
            services.AddSingleton<IHostedService>(serviceProvider =>
                serviceProvider.GetRequiredService<ExperimentSessionJournalFlushWorker>());
        }
        else
        {
            services.AddSingleton<IExperimentStateStoreAdapter, InMemoryExperimentStateStoreAdapter>();
            services.AddSingleton<IExperimentSessionJournalStoreAdapter, InMemoryExperimentSessionJournalStoreAdapter>();
            services.AddSingleton<IExperimentReplayExportStoreAdapter>(serviceProvider =>
                new InMemoryExperimentReplayExportStoreAdapter(serviceProvider.GetRequiredService<IExperimentReplayExportSerializer>()));
            services.AddSingleton<IReadingMaterialSetupStoreAdapter, InMemoryReadingMaterialSetupStoreAdapter>();
        }

        services.AddSingleton<IEyeTrackerLicenseStoreAdapter, FileEyeTrackerLicenseStoreAdapter>();
        services.AddHostedService<ExperimentStateCheckpointWorker>();

        return services;
    }
}
