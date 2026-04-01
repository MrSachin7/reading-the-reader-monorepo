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
    double ContentWidthPx);

public sealed record UpdateReadingFocusCommand(
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? ActiveTokenId,
    string? ActiveBlockId);

public sealed record UpdateReadingContextPreservationCommand(
    string Status,
    string AnchorSource,
    string? AnchorTokenId,
    string? AnchorBlockId,
    double? AnchorErrorPx,
    double? ViewportDeltaPx,
    long InterventionAppliedAtUnixMs,
    long MeasuredAtUnixMs,
    string? Reason);

public sealed record UpdateReadingAttentionSummaryCommand(
    long UpdatedAtUnixMs,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats,
    string? CurrentTokenId,
    long? CurrentTokenDurationMs,
    int FixatedTokenCount,
    int SkimmedTokenCount);

public sealed record FinishExperimentCommand(string Source);
