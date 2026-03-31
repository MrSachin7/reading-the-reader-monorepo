using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.WebApi.Contracts.InterventionModules;

namespace ReadingTheReader.WebApi.InterventionModuleEndpoints;

public sealed class GetInterventionModulesEndpoint : EndpointWithoutRequest<IReadOnlyList<InterventionModuleDescriptorResponse>>
{
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetInterventionModulesEndpoint(IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/intervention-modules");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        var response = _experimentSessionQueryService
            .GetInterventionModules()
            .Select(descriptor => new InterventionModuleDescriptorResponse(
                descriptor.ModuleId,
                descriptor.DisplayName,
                descriptor.Description,
                descriptor.Group,
                descriptor.SortOrder,
                descriptor.Parameters
                    .Select(parameter => new InterventionModuleParameterResponse(
                        parameter.Key,
                        parameter.DisplayName,
                        parameter.Description,
                        parameter.ValueKind,
                        parameter.Required,
                        parameter.DefaultValue,
                        parameter.Unit,
                        parameter.MinValue,
                        parameter.MaxValue,
                        parameter.Step,
                        parameter.Options is null
                            ? []
                            : [.. parameter.Options.Select(option => new InterventionModuleParameterOptionResponse(
                                option.Value,
                                option.DisplayName,
                                option.Description))]))
                    .ToArray()))
            .ToArray();

        return Send.OkAsync(response, ct);
    }
}
