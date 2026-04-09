using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
            services.AddSingleton<IExperimentStateStoreAdapter>(_ => new FileSnapshotExperimentStateStoreAdapter(options.SnapshotFilePath));
            services.AddSingleton<IExperimentReplayExportStoreAdapter>(serviceProvider =>
                new FileExperimentReplayExportStoreAdapter(
                    options.ReplayExportFilePath,
                    options.SavedReplayExportsDirectoryPath,
                    serviceProvider.GetRequiredService<IExperimentReplayExportSerializer>()));
            services.AddSingleton<IExperimentReplayRecoveryStoreAdapter>(_ =>
                new FileExperimentReplayRecoveryStoreAdapter(options.ReplayRecoveryDirectoryPath));
            services.AddSingleton<IReadingMaterialSetupStoreAdapter>(_ => new FileReadingMaterialSetupStoreAdapter(readingMaterialSetupOptions.DirectoryPath));
        }
        else
        {
            services.AddSingleton<IExperimentStateStoreAdapter, InMemoryExperimentStateStoreAdapter>();
            services.AddSingleton<IExperimentReplayExportStoreAdapter>(serviceProvider =>
                new InMemoryExperimentReplayExportStoreAdapter(serviceProvider.GetRequiredService<IExperimentReplayExportSerializer>()));
            services.AddSingleton<IExperimentReplayRecoveryStoreAdapter, InMemoryExperimentReplayRecoveryStoreAdapter>();
            services.AddSingleton<IReadingMaterialSetupStoreAdapter, InMemoryReadingMaterialSetupStoreAdapter>();
        }

        services.AddSingleton<IEyeTrackerLicenseStoreAdapter, FileEyeTrackerLicenseStoreAdapter>();
        services.AddHostedService<ExperimentStateCheckpointWorker>();
        services.AddHostedService<ExperimentReplayRecoveryFlushWorker>();

        return services;
    }
}
