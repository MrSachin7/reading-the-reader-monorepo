using Microsoft.Extensions.DependencyInjection;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.ApplicationContracts.Participants;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.core.Application;

public static class ApplicationModuleInstaller
{
    public static IServiceCollection InstallApplicationModule(
        this IServiceCollection collection,
        CalibrationOptions calibrationOptions,
        ExternalProviderOptions externalProviderOptions)
    {
        collection.AddSingleton(calibrationOptions);
        collection.AddSingleton(externalProviderOptions);
        collection.AddSingleton<IParticipantService, ParticipantService>();
        collection.AddSingleton<IReadingMaterialSetupService, ReadingMaterialSetupService>();
        foreach (var module in BuiltInReadingInterventionModules.All)
        {
            collection.AddSingleton(typeof(IReadingInterventionModule), module);
        }

        collection.AddSingleton<IReadingInterventionModuleRegistry, ReadingInterventionModuleRegistry>();
        collection.AddSingleton<IReadingInterventionRuntime, ReadingInterventionRuntime>();
        collection.AddSingleton<IDecisionContextFactory, DecisionContextFactory>();
        collection.AddSingleton<IDecisionStrategy, RuleBasedDecisionStrategy>();
        collection.AddSingleton<IExternalProviderGateway, ExternalProviderGateway>();
        collection.AddSingleton<IDecisionStrategy, ExternalDecisionStrategy>();
        collection.AddSingleton<IDecisionStrategyRegistry, DecisionStrategyRegistry>();
        collection.AddSingleton<IDecisionStrategyCoordinator, DecisionStrategyCoordinator>();
        collection.AddSingleton<ExperimentSessionManager>();
        collection.AddSingleton<IExperimentSessionManager>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentRuntimeAuthority>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentSessionQueryService>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IReaderObservationService, ReaderObservationService>();
        collection.AddSingleton<IExperimentCommandIngress, ExperimentCommandIngress>();
        collection.AddSingleton<IProviderConnectionRegistry, ProviderConnectionRegistry>();
        collection.AddSingleton<IProviderIngressService, ProviderIngressService>();
        collection.AddSingleton<ISensingOperations, SensingOperations>();
        collection.AddSingleton<IEyeTrackerService, EyeTrackerService>();
        collection.AddSingleton<ICalibrationService, CalibrationService>();
        collection.AddSingleton<IReaderShellSettingsService, ReaderShellSettingsService>();
        return collection;
    }
}
