using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ReadingInterventionRuntimeTests
{
    [Fact]
    public void Apply_ProducesInterventionEvent_AndUpdatedPresentation()
    {
        var sut = new ReadingInterventionRuntime();

        var result = sut.Apply(
            ReadingPresentationSnapshot.Default,
            new ApplyInterventionCommand(
                "manual",
                "researcher-ui",
                "Increase font size for readability",
                new ReadingPresentationPatch(null, 22, null, null, null, null)),
            12345);

        Assert.NotNull(result);
        Assert.Equal(22, result!.Presentation.FontSizePx);
        Assert.Equal("manual", result.Event.Source);
        Assert.Equal("researcher-ui", result.Event.Trigger);
        Assert.Equal("Increase font size for readability", result.Event.Reason);
        Assert.Equal(12345, result.Event.AppliedAtUnixMs);
    }

    [Fact]
    public void Apply_ReturnsNull_WhenPresentationWouldNotChange()
    {
        var sut = new ReadingInterventionRuntime();

        var result = sut.Apply(
            ReadingPresentationSnapshot.Default,
            new ApplyInterventionCommand(
                "manual",
                "researcher-ui",
                "No-op",
                new ReadingPresentationPatch(
                    ReadingPresentationSnapshot.Default.FontFamily,
                    ReadingPresentationSnapshot.Default.FontSizePx,
                    ReadingPresentationSnapshot.Default.LineWidthPx,
                    ReadingPresentationSnapshot.Default.LineHeight,
                    ReadingPresentationSnapshot.Default.LetterSpacingEm,
                    ReadingPresentationSnapshot.Default.EditableByResearcher)),
            12345);

        Assert.Null(result);
    }
}
