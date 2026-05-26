using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;

public sealed class FacialStateModuleDefinition : IModuleDefinition
{
    public string ModuleId => FacialStateModuleIds.ModuleId;

    public string DisplayName => "Facial state sensing";

    public string ProtocolVersion => FacialStateModuleProtocolVersions.V1;

    public IReadOnlyList<string> InboundMessageTypes =>
    [
        FacialStateInboundMessageTypes.FacialObservation,
        FacialStateInboundMessageTypes.WebcamStatus,
        FacialStateInboundMessageTypes.GazeSample
    ];

    public IReadOnlyList<string> OutboundMessageTypes => [];

    public ModuleCapabilities Capabilities { get; } = new(new Dictionary<string, string?>
    {
        [FacialStateModuleCapabilityKeys.ProvidesFace] = bool.TrueString,
        [FacialStateModuleCapabilityKeys.ProvidesGaze] = bool.FalseString
    });
}
