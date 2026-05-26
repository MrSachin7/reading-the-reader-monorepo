using Microsoft.Extensions.DependencyInjection;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.ApplicationContracts.Participants;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
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
        ExperimentSetupTestingOptions experimentSetupTestingOptions)
    {
        collection.AddSingleton(calibrationOptions);
        collection.AddSingleton(experimentSetupTestingOptions);
        collection.AddSingleton<IParticipantService, ParticipantService>();
        collection.AddSingleton<IReadingMaterialSetupService, ReadingMaterialSetupService>();
        collection.AddSingleton<IExperimentSetupService, ExperimentSetupService>();
        foreach (var module in BuiltInReadingInterventionModules.All)
        {
            collection.AddSingleton(typeof(IReadingInterventionModule), module);
        }

        collection.AddSingleton<IReadingInterventionModuleRegistry, ReadingInterventionModuleRegistry>();
        collection.AddSingleton<IReadingInterventionRuntime, ReadingInterventionRuntime>();
        collection.AddSingleton<IEyeMovementAnalysisStrategy, BuiltInEyeMovementAnalysisStrategy>();
        collection.AddSingleton<IEyeMovementAnalysisStrategy, ExternalEyeMovementAnalysisStrategy>();
        collection.AddSingleton<IEyeMovementAnalysisStrategyRegistry, EyeMovementAnalysisStrategyRegistry>();
        collection.AddSingleton<IEyeMovementAnalysisStrategyCoordinator, EyeMovementAnalysisStrategyCoordinator>();
        collection.AddSingleton<IDecisionContextFactory, DecisionContextFactory>();
        collection.AddSingleton<IDecisionStrategy, RuleBasedDecisionStrategy>();
        collection.AddSingleton<InterventionsOutboundPublisher>();
        collection.AddSingleton<IExternalProviderGateway>(sp => sp.GetRequiredService<InterventionsOutboundPublisher>());
        collection.AddSingleton<IModuleDefinition, InterventionsModuleDefinition>();
        collection.AddSingleton<IModuleInboundHandler, InterventionsInboundHandler>();
        collection.AddSingleton<IDecisionStrategy, ExternalDecisionStrategy>();
        collection.AddSingleton<IDecisionStrategyRegistry, DecisionStrategyRegistry>();
        collection.AddSingleton<IDecisionStrategyCoordinator, DecisionStrategyCoordinator>();
        collection.AddSingleton<FixationAnalysisOutboundPublisher>();
        collection.AddSingleton<IAnalysisProviderGateway>(sp => sp.GetRequiredService<FixationAnalysisOutboundPublisher>());
        collection.AddSingleton<IModuleDefinition, FixationAnalysisModuleDefinition>();
        collection.AddSingleton<IModuleInboundHandler, FixationAnalysisInboundHandler>();
        collection.AddSingleton<ExperimentSessionManager>();
        collection.AddSingleton<IExperimentSessionManager>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentRuntimeAuthority>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentSessionQueryService>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IExperimentReplayRecoveryBuffer>(sp => sp.GetRequiredService<ExperimentSessionManager>());
        collection.AddSingleton<IReaderObservationService, ReaderObservationService>();
        collection.AddSingleton<IExperimentCommandIngress, ExperimentCommandIngress>();
        collection.AddSingleton<ISensingOperations, SensingOperations>();
        collection.AddSingleton<ISensingModeSettingsService, SensingModeSettingsService>();
        collection.AddSingleton<IEyeTrackerService, EyeTrackerService>();
        collection.AddSingleton<ICalibrationService, CalibrationService>();
        collection.AddSingleton<IReaderShellSettingsService, ReaderShellSettingsService>();
        return collection;
    }
}
