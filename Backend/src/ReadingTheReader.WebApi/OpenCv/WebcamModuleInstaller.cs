using Microsoft.Extensions.DependencyInjection;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.WebApi.OpenCv;

public static class WebcamModuleInstaller
{
    public static IServiceCollection InstallWebcamModule(this IServiceCollection services)
    {
        services.AddSingleton<OpenCvWebcamSensingWorker>();
        services.AddSingleton<IFacialStateAdapter>(sp => sp.GetRequiredService<OpenCvWebcamSensingWorker>());
        services.AddHostedService(sp => sp.GetRequiredService<OpenCvWebcamSensingWorker>());
        services.AddHostedService<FacialStateService>();
        return services;
    }
}
