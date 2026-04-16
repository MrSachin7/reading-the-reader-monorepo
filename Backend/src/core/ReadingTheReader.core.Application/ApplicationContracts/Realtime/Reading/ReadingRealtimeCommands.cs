using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

public sealed record UpsertReadingSessionCommand(
    string DocumentId,
    string Title,
    string Markdown,
    string? SourceSetupId,
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance);

public sealed record UpdateParticipantViewportCommand(
    double ScrollProgress,
    double ScrollTopPx,
    double ViewportWidthPx,
    double ViewportHeightPx,
    double ContentHeightPx,
    double ContentWidthPx,
    int ActivePageIndex = 0,
    int PageCount = 1,
    long? LastPageTurnAtUnixMs = null,
    ParticipantScreenSnapshot? Screen = null);

public sealed record UpdateReadingFocusCommand(
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? ActiveTokenId,
    string? ActiveBlockId,
    string? ActiveSentenceId = null);

public sealed record UpdateReadingContextPreservationCommand(
    string Status,
    string AnchorSource,
    string? AnchorSentenceId = null,
    string? AnchorTokenId = null,
    string? AnchorBlockId = null,
    double? AnchorErrorPx = null,
    double? ViewportDeltaPx = null,
    string CommitBoundary = ReadingInterventionCommitBoundaries.Immediate,
    long? WaitDurationMs = null,
    long InterventionAppliedAtUnixMs = 0,
    long MeasuredAtUnixMs = 0,
    string? Reason = null);

public sealed record UpdateReadingAttentionSummaryCommand(
    long UpdatedAtUnixMs,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats,
    string? CurrentTokenId,
    long? CurrentTokenDurationMs,
    int FixatedTokenCount,
    int SkimmedTokenCount);

public sealed record FinishExperimentCommand(string Source);
