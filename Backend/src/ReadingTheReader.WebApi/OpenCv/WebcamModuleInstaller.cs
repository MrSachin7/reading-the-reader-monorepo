using Microsoft.Extensions.DependencyInjection;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.WebApi.OpenCv;

public static class WebcamModuleInstaller
{
    public static IServiceCollection InstallWebcamModule(this IServiceCollection services)
    {
        // Built-in source: OpenCV worker.
        services.AddSingleton<OpenCvWebcamSensingWorker>();
        services.AddSingleton<IFacialStateAdapter>(sp => sp.GetRequiredService<OpenCvWebcamSensingWorker>());
        services.AddHostedService(sp => sp.GetRequiredService<OpenCvWebcamSensingWorker>());

        // Shared classification + session-ingestion bridge.
        services.AddSingleton<FacialStateService>();
        services.AddHostedService(sp => sp.GetRequiredService<FacialStateService>());

        // Module provider registration: declares the facial-state module to the framework
        // and wires the inbound handler so external providers can take over.
        services.AddSingleton<IModuleDefinition, FacialStateModuleDefinition>();
        services.AddSingleton<IModuleInboundHandler, FacialStateInboundHandler>();

        return services;
    }
}
