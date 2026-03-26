using Microsoft.Extensions.DependencyInjection;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.ApplicationContracts.Participants;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.core.Application;

public static class ApplicationModuleInstaller
{
    public static IServiceCollection InstallApplicationModule(this IServiceCollection collection, CalibrationOptions calibrationOptions)
    {
        collection.AddSingleton(calibrationOptions);
        collection.AddSingleton<IParticipantService, ParticipantService>();
        collection.AddSingleton<IReadingMaterialSetupService, ReadingMaterialSetupService>();
        collection.AddSingleton<IReadingInterventionRuntime, ReadingInterventionRuntime>();
        collection.AddSingleton<ExperimentSessionManager>();
        collection.AddSingleton<IExperimentSessionManager>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentRuntimeAuthority>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentSessionQueryService>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IReaderObservationService, ReaderObservationService>();
        collection.AddSingleton<IExperimentCommandIngress, ExperimentCommandIngress>();
        collection.AddSingleton<ISensingOperations, SensingOperations>();
        collection.AddSingleton<IEyeTrackerService, EyeTrackerService>();
        collection.AddSingleton<ICalibrationService, CalibrationService>();
        collection.AddSingleton<IReaderShellSettingsService, ReaderShellSettingsService>();
        return collection;
    }
}
