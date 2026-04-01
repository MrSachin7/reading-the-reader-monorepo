namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public static class ReadingPresentationRules
{
    public const int MinFontSizePx = 12;
    public const int MaxFontSizePx = 48;
    public const int MinLineWidthPx = 320;
    public const int MaxLineWidthPx = 1600;
    public const double MinLineHeight = 1.0;
    public const double MaxLineHeight = 3.0;
    public const double MinLetterSpacingEm = -0.05;
    public const double MaxLetterSpacingEm = 0.2;

    public static ReadingPresentationSnapshot Normalize(ReadingPresentationSnapshot? snapshot)
    {
        var source = snapshot ?? ReadingPresentationSnapshot.Default;

        return new ReadingPresentationSnapshot(
            NormalizeFontFamily(source.FontFamily),
            Clamp(source.FontSizePx, MinFontSizePx, MaxFontSizePx, ReadingPresentationSnapshot.Default.FontSizePx),
            Clamp(source.LineWidthPx, MinLineWidthPx, MaxLineWidthPx, ReadingPresentationSnapshot.Default.LineWidthPx),
            Clamp(source.LineHeight, MinLineHeight, MaxLineHeight, ReadingPresentationSnapshot.Default.LineHeight),
            Clamp(source.LetterSpacingEm, MinLetterSpacingEm, MaxLetterSpacingEm, ReadingPresentationSnapshot.Default.LetterSpacingEm),
            source.EditableByResearcher);
    }

    public static string NormalizeFontFamily(string? fontFamily)
    {
        return string.IsNullOrWhiteSpace(fontFamily)
            ? ReadingPresentationSnapshot.Default.FontFamily
            : fontFamily.Trim();
    }

    private static int Clamp(int value, int min, int max, int fallback)
    {
        if (value == 0)
        {
            value = fallback;
        }

        return Math.Min(max, Math.Max(min, value));
    }

    private static double Clamp(double value, double min, double max, double fallback)
    {
        if (Math.Abs(value) < double.Epsilon)
        {
            value = fallback;
        }

        return Math.Min(max, Math.Max(min, value));
    }
}

public static class ReaderAppearanceRules
{
    public static ReaderAppearanceSnapshot Normalize(ReaderAppearanceSnapshot? snapshot)
    {
        var source = snapshot ?? ReaderAppearanceSnapshot.Default;

        return new ReaderAppearanceSnapshot(
            NormalizeThemeMode(source.ThemeMode),
            NormalizePalette(source.Palette),
            ReadingPresentationRules.NormalizeFontFamily(source.AppFont));
    }

    public static string NormalizeThemeMode(string? themeMode)
    {
        return string.Equals(themeMode?.Trim(), "dark", StringComparison.OrdinalIgnoreCase)
            ? "dark"
            : ReaderAppearanceSnapshot.Default.ThemeMode;
    }

    public static string NormalizePalette(string? palette)
    {
        if (string.Equals(palette?.Trim(), "sepia", StringComparison.OrdinalIgnoreCase))
        {
            return "sepia";
        }

        if (string.Equals(palette?.Trim(), "high-contrast", StringComparison.OrdinalIgnoreCase))
        {
            return "high-contrast";
        }

        return ReaderAppearanceSnapshot.Default.Palette;
    }
}

public sealed record ReaderAppearanceSnapshot(
    string ThemeMode,
    string Palette,
    string AppFont)
{
    public static ReaderAppearanceSnapshot Default { get; } = new(
        "light",
        "default",
        "geist");

    public ReaderAppearanceSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ReadingPresentationSnapshot(
    string FontFamily,
    int FontSizePx,
    int LineWidthPx,
    double LineHeight,
    double LetterSpacingEm,
    bool EditableByResearcher)
{
    public static ReadingPresentationSnapshot Default { get; } = new(
        "merriweather",
        18,
        680,
        1.8,
        0,
        true);

    public bool IsPresentationLocked => !EditableByResearcher;

    public ReadingPresentationSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ReadingContentSnapshot(
    string DocumentId,
    string Title,
    string Markdown,
    string? SourceSetupId,
    long UpdatedAtUnixMs)
{
    public bool UsesSavedSetup => !string.IsNullOrWhiteSpace(SourceSetupId);

    public ReadingContentSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ParticipantViewportSnapshot(
    bool IsConnected,
    double ScrollProgress,
    double ScrollTopPx,
    double ViewportWidthPx,
    double ViewportHeightPx,
    double ContentHeightPx,
    double ContentWidthPx,
    long UpdatedAtUnixMs)
{
    public static ParticipantViewportSnapshot Disconnected { get; } = new(false, 0, 0, 0, 0, 0, 0, 0);

    public ParticipantViewportSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ReadingFocusSnapshot(
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? ActiveTokenId,
    string? ActiveBlockId,
    long UpdatedAtUnixMs)
{
    public static ReadingFocusSnapshot Empty { get; } = new(false, null, null, null, null, 0);

    public ReadingFocusSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ReadingContextPreservationEventSnapshot(
    string Status,
    string AnchorSource,
    string? AnchorTokenId,
    string? AnchorBlockId,
    double? AnchorErrorPx,
    double? ViewportDeltaPx,
    long InterventionAppliedAtUnixMs,
    long MeasuredAtUnixMs,
    string? Reason)
{
    public ReadingContextPreservationEventSnapshot Copy()
    {
        return new ReadingContextPreservationEventSnapshot(
            NormalizeStatus(Status),
            NormalizeAnchorSource(AnchorSource),
            InterventionContractValueHelpers.NormalizeOptionalText(AnchorTokenId),
            InterventionContractValueHelpers.NormalizeOptionalText(AnchorBlockId),
            AnchorErrorPx,
            ViewportDeltaPx,
            InterventionAppliedAtUnixMs,
            MeasuredAtUnixMs,
            InterventionContractValueHelpers.NormalizeOptionalText(Reason));
    }

    public static string NormalizeStatus(string? status)
    {
        if (string.Equals(status?.Trim(), "degraded", StringComparison.OrdinalIgnoreCase))
        {
            return "degraded";
        }

        if (string.Equals(status?.Trim(), "failed", StringComparison.OrdinalIgnoreCase))
        {
            return "failed";
        }

        return "preserved";
    }

    public static string NormalizeAnchorSource(string? anchorSource)
    {
        if (string.Equals(anchorSource?.Trim(), "fallback-token", StringComparison.OrdinalIgnoreCase))
        {
            return "fallback-token";
        }

        if (string.Equals(anchorSource?.Trim(), "block-anchor", StringComparison.OrdinalIgnoreCase))
        {
            return "block-anchor";
        }

        if (string.Equals(anchorSource?.Trim(), "scroll-only", StringComparison.OrdinalIgnoreCase))
        {
            return "scroll-only";
        }

        return "active-token";
    }
}

public sealed record LayoutInterventionGuardrailSnapshot(
    string Status,
    string? Reason,
    IReadOnlyList<string> AffectedProperties,
    long EvaluatedAtUnixMs,
    long? CooldownUntilUnixMs)
{
    public LayoutInterventionGuardrailSnapshot Copy()
    {
        return new LayoutInterventionGuardrailSnapshot(
            NormalizeStatus(Status),
            InterventionContractValueHelpers.NormalizeOptionalText(Reason),
            AffectedProperties is null ? [] : [.. AffectedProperties.Select(NormalizeAffectedProperty)],
            Math.Max(EvaluatedAtUnixMs, 0),
            CooldownUntilUnixMs.HasValue ? Math.Max(CooldownUntilUnixMs.Value, 0) : null);
    }

    public static string NormalizeStatus(string? status)
    {
        return string.Equals(status?.Trim(), "suppressed", StringComparison.OrdinalIgnoreCase)
            ? "suppressed"
            : "applied";
    }

    public static string NormalizeAffectedProperty(string? affectedProperty)
    {
        return affectedProperty switch
        {
            "font-family" => "font-family",
            "font-size" => "font-size",
            "line-width" => "line-width",
            "line-height" => "line-height",
            "letter-spacing" => "letter-spacing",
            _ => "font-size"
        };
    }
}

public sealed record ReadingAttentionTokenSnapshot(
    long FixationMs,
    int FixationCount,
    int SkimCount,
    long MaxFixationMs,
    long LastFixationMs)
{
    public ReadingAttentionTokenSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record ReadingAttentionSummarySnapshot(
    long UpdatedAtUnixMs,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats,
    string? CurrentTokenId,
    long? CurrentTokenDurationMs,
    int FixatedTokenCount,
    int SkimmedTokenCount)
{
    public static ReadingAttentionSummarySnapshot Empty { get; } = new(0, new Dictionary<string, ReadingAttentionTokenSnapshot>(), null, null, 0, 0);

    public ReadingAttentionSummarySnapshot Copy()
    {
        return new ReadingAttentionSummarySnapshot(
            UpdatedAtUnixMs,
            TokenStats is null
                ? new Dictionary<string, ReadingAttentionTokenSnapshot>()
                : TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy()),
            string.IsNullOrWhiteSpace(CurrentTokenId) ? null : CurrentTokenId.Trim(),
            CurrentTokenDurationMs,
            FixatedTokenCount,
            SkimmedTokenCount);
    }
}

public sealed record InterventionEventSnapshot(
    Guid Id,
    string Source,
    string Trigger,
    string Reason,
    long AppliedAtUnixMs,
    ReadingPresentationSnapshot AppliedPresentation,
    ReaderAppearanceSnapshot AppliedAppearance,
    string? ModuleId = null,
    IReadOnlyDictionary<string, string?>? Parameters = null)
{
    public InterventionEventSnapshot Copy()
    {
        return new InterventionEventSnapshot(
            Id,
            Source,
            Trigger,
            Reason,
            AppliedAtUnixMs,
            AppliedPresentation.Copy(),
            AppliedAppearance.Copy(),
            InterventionContractValueHelpers.NormalizeOptionalText(ModuleId),
            InterventionContractValueHelpers.CloneParameters(Parameters));
    }
}

public sealed record LiveReadingSessionSnapshot(
    ReadingContentSnapshot? Content,
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance,
    ParticipantViewportSnapshot ParticipantViewport,
    ReadingFocusSnapshot Focus,
    ReadingContextPreservationEventSnapshot? LatestContextPreservation,
    IReadOnlyList<ReadingContextPreservationEventSnapshot> RecentContextPreservationEvents,
    LayoutInterventionGuardrailSnapshot? LatestLayoutGuardrail,
    InterventionEventSnapshot? LatestIntervention,
    IReadOnlyList<InterventionEventSnapshot> RecentInterventions,
    ReadingAttentionSummarySnapshot? AttentionSummary = null)
{
    public static LiveReadingSessionSnapshot Empty { get; } = new(
        null,
        ReadingPresentationSnapshot.Default,
        ReaderAppearanceSnapshot.Default,
        ParticipantViewportSnapshot.Disconnected,
        ReadingFocusSnapshot.Empty,
        null,
        [],
        null,
        null,
        [],
        null);

    public LiveReadingSessionSnapshot Copy()
    {
        return new LiveReadingSessionSnapshot(
            Content?.Copy(),
            (Presentation ?? ReadingPresentationSnapshot.Default).Copy(),
            (Appearance ?? ReaderAppearanceSnapshot.Default).Copy(),
            (ParticipantViewport ?? ParticipantViewportSnapshot.Disconnected).Copy(),
            (Focus ?? ReadingFocusSnapshot.Empty).Copy(),
            LatestContextPreservation?.Copy(),
            RecentContextPreservationEvents is null ? [] : [.. RecentContextPreservationEvents.Select(item => item.Copy())],
            LatestLayoutGuardrail?.Copy(),
            LatestIntervention?.Copy(),
            RecentInterventions is null ? [] : [.. RecentInterventions.Select(item => item.Copy())],
            AttentionSummary?.Copy());
    }
}

public sealed record UpsertReadingSessionCommand(
    string DocumentId,
    string Title,
    string Markdown,
    string? SourceSetupId,
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance);

public sealed record ReadingPresentationPatch(
    string? FontFamily,
    int? FontSizePx,
    int? LineWidthPx,
    double? LineHeight,
    double? LetterSpacingEm,
    bool? EditableByResearcher);

public sealed record ApplyInterventionCommand(
    string Source,
    string Trigger,
    string Reason,
    ReadingPresentationPatch Presentation,
    ReaderAppearancePatch Appearance,
    string? ModuleId = null,
    IReadOnlyDictionary<string, string?>? Parameters = null)
{
    public ApplyInterventionCommand Copy()
    {
        return new ApplyInterventionCommand(
            Source,
            Trigger,
            Reason,
            Presentation with { },
            Appearance with { },
            InterventionContractValueHelpers.NormalizeOptionalText(ModuleId),
            InterventionContractValueHelpers.CloneParameters(Parameters));
    }
}

public sealed record ReaderAppearancePatch(
    string? ThemeMode,
    string? Palette,
    string? AppFont);

internal static class InterventionContractValueHelpers
{
    public static IReadOnlyDictionary<string, string?>? CloneParameters(IReadOnlyDictionary<string, string?>? parameters)
    {
        return parameters is null
            ? null
            : new Dictionary<string, string?>(parameters, StringComparer.Ordinal);
    }

    public static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

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
