using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IFacialStateAdapter
{
    event EventHandler<FacialObservationSnapshot> FacialObservationReceived;
    event EventHandler<GazeData> GazeSampleDerived;
    event EventHandler<WebcamSensingStatusSnapshot> StatusChanged;
}
