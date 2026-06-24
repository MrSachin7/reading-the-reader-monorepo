using System.Reflection;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

// Encodes the ports-and-adapters dependency rule as an executable test (RQ1 / NFR1):
// the core (Domain and Application) must never depend outward on an infrastructure,
// transport, or web-host assembly. The project references already make a violating
// reference a compile error; this test guards that invariant against regression and
// makes the modularity claim verifiable rather than merely asserted in prose.
public sealed class ArchitectureBoundaryTests
{
    private static readonly string[] OutwardAssemblyMarkers =
    [
        "Realtime.Persistence",
        "RealtimeMessenger",
        "TobiiEyetracker",
        "WebApi",
    ];

    [Fact]
    public void Domain_depends_on_no_other_project_assembly()
    {
        var domain = typeof(InterventionEventSnapshot).Assembly;

        var projectReferences = domain.GetReferencedAssemblies()
            .Select(reference => reference.Name ?? string.Empty)
            .Where(name => name.StartsWith("ReadingTheReader", StringComparison.Ordinal))
            .ToArray();

        Assert.Empty(projectReferences);
    }

    [Fact]
    public void Application_core_depends_on_no_infrastructure_or_transport_assembly()
    {
        var application = typeof(ExperimentSessionManager).Assembly;

        var outwardReferences = application.GetReferencedAssemblies()
            .Select(reference => reference.Name ?? string.Empty)
            .Where(name => OutwardAssemblyMarkers.Any(marker =>
                name.Contains(marker, StringComparison.OrdinalIgnoreCase)))
            .ToArray();

        Assert.Empty(outwardReferences);
    }
}
