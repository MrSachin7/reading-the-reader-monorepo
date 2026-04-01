using System.Globalization;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public sealed class ReadingInterventionRuntime : IReadingInterventionRuntime
{
    private readonly IReadingInterventionModuleRegistry _moduleRegistry;

    public ReadingInterventionRuntime(IReadingInterventionModuleRegistry moduleRegistry)
    {
        _moduleRegistry = moduleRegistry;
    }

    public InterventionExecutionResult? Apply(
        ReadingPresentationSnapshot currentPresentation,
        ReaderAppearanceSnapshot currentAppearance,
        ApplyInterventionCommand command,
        long appliedAtUnixMs)
    {
        var safeCurrentPresentation = ReadingPresentationRules.Normalize(currentPresentation);
        var safeCurrentAppearance = ReaderAppearanceRules.Normalize(currentAppearance);
        var safeCommand = command ?? throw new ArgumentNullException(nameof(command));
        if (TryBuildRequest(safeCommand, out var request))
        {
            return ApplyModuleRequest(
                safeCurrentPresentation,
                safeCurrentAppearance,
                safeCommand,
                request!,
                appliedAtUnixMs);
        }

        return ApplyLegacyPatchCommand(
            safeCurrentPresentation,
            safeCurrentAppearance,
            safeCommand,
            appliedAtUnixMs);
    }

    private InterventionExecutionResult? ApplyModuleRequest(
        ReadingPresentationSnapshot safeCurrentPresentation,
        ReaderAppearanceSnapshot safeCurrentAppearance,
        ApplyInterventionCommand command,
        ReadingInterventionRequest request,
        long appliedAtUnixMs)
    {
        var module = _moduleRegistry.GetRequired(request.ModuleId);
        var validation = module.Validate(request);
        if (!validation.IsValid)
        {
            throw new ArgumentException(
                validation.ErrorMessage ?? $"Invalid parameters for module '{request.ModuleId}'.",
                nameof(command));
        }

        var moduleResult = module.Execute(
            new ReadingInterventionExecutionContext(safeCurrentPresentation, safeCurrentAppearance),
            request);
        var nextPresentation = ReadingPresentationRules.Normalize(moduleResult.Presentation);
        var nextAppearance = ReaderAppearanceRules.Normalize(moduleResult.Appearance);

        if (nextPresentation == safeCurrentPresentation && nextAppearance == safeCurrentAppearance)
        {
            return null;
        }

        var interventionEvent = new InterventionEventSnapshot(
            Guid.NewGuid(),
            NormalizeText(command.Source, "manual"),
            NormalizeText(command.Trigger, "researcher-ui"),
            NormalizeText(command.Reason, "Manual presentation update"),
            appliedAtUnixMs,
            nextPresentation.Copy(),
            nextAppearance.Copy(),
            module.Descriptor.ModuleId,
            InterventionContractValueHelpers.CloneParameters(moduleResult.NormalizedParameters));

        return new InterventionExecutionResult(nextPresentation, nextAppearance, interventionEvent);
    }

    private static InterventionExecutionResult? ApplyLegacyPatchCommand(
        ReadingPresentationSnapshot safeCurrentPresentation,
        ReaderAppearanceSnapshot safeCurrentAppearance,
        ApplyInterventionCommand command,
        long appliedAtUnixMs)
    {
        var nextPresentation = ReadingPresentationRules.Normalize(new ReadingPresentationSnapshot(
            command.Presentation.FontFamily ?? safeCurrentPresentation.FontFamily,
            command.Presentation.FontSizePx ?? safeCurrentPresentation.FontSizePx,
            command.Presentation.LineWidthPx ?? safeCurrentPresentation.LineWidthPx,
            command.Presentation.LineHeight ?? safeCurrentPresentation.LineHeight,
            command.Presentation.LetterSpacingEm ?? safeCurrentPresentation.LetterSpacingEm,
            command.Presentation.EditableByResearcher ?? safeCurrentPresentation.EditableByResearcher));

        var nextAppearance = ReaderAppearanceRules.Normalize(new ReaderAppearanceSnapshot(
            command.Appearance.ThemeMode ?? safeCurrentAppearance.ThemeMode,
            command.Appearance.Palette ?? safeCurrentAppearance.Palette,
            command.Appearance.AppFont ?? safeCurrentAppearance.AppFont));

        if (nextPresentation == safeCurrentPresentation && nextAppearance == safeCurrentAppearance)
        {
            return null;
        }

        var interventionEvent = new InterventionEventSnapshot(
            Guid.NewGuid(),
            NormalizeText(command.Source, "manual"),
            NormalizeText(command.Trigger, "researcher-ui"),
            NormalizeText(command.Reason, "Manual presentation update"),
            appliedAtUnixMs,
            nextPresentation.Copy(),
            nextAppearance.Copy(),
            null,
            CaptureLegacyParameters(command));

        return new InterventionExecutionResult(nextPresentation, nextAppearance, interventionEvent);
    }

    private static bool TryBuildRequest(ApplyInterventionCommand command, out ReadingInterventionRequest? request)
    {
        if (!string.IsNullOrWhiteSpace(command.ModuleId))
        {
            request = new ReadingInterventionRequest(
                command.ModuleId!.Trim(),
                NormalizeParameters(command.Parameters));
            return true;
        }

        var inferredParameters = new List<KeyValuePair<string, string?>>();
        string? inferredModuleId = null;
        var hasMultipleLegacyFields = false;

        TryInfer(
            command.Presentation.FontFamily,
            ReadingInterventionModuleIds.FontFamily,
            "fontFamily",
            value => ReadingPresentationRules.NormalizeFontFamily(value),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Presentation.FontSizePx,
            ReadingInterventionModuleIds.FontSize,
            "fontSizePx",
            value => value.ToString(CultureInfo.InvariantCulture),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Presentation.LineWidthPx,
            ReadingInterventionModuleIds.LineWidth,
            "lineWidthPx",
            value => value.ToString(CultureInfo.InvariantCulture),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Presentation.LineHeight,
            ReadingInterventionModuleIds.LineHeight,
            "lineHeight",
            value => value.ToString("0.##", CultureInfo.InvariantCulture),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Presentation.LetterSpacingEm,
            ReadingInterventionModuleIds.LetterSpacing,
            "letterSpacingEm",
            value => value.ToString("0.##", CultureInfo.InvariantCulture),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Presentation.EditableByResearcher,
            ReadingInterventionModuleIds.ParticipantEditLock,
            "locked",
            value => (!value).ToString().ToLowerInvariant(),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Appearance.ThemeMode,
            ReadingInterventionModuleIds.ThemeMode,
            "themeMode",
            value => ReaderAppearanceRules.NormalizeThemeMode(value),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);
        TryInfer(
            command.Appearance.Palette,
            ReadingInterventionModuleIds.Palette,
            "palette",
            value => ReaderAppearanceRules.NormalizePalette(value),
            ref inferredModuleId,
            ref hasMultipleLegacyFields,
            inferredParameters);

        if (command.Appearance.AppFont is not null || hasMultipleLegacyFields || inferredParameters.Count > 1)
        {
            request = null;
            return false;
        }

        if (inferredModuleId is null || inferredParameters.Count == 0)
        {
            request = null;
            return false;
        }

        request = new ReadingInterventionRequest(
            inferredModuleId,
            inferredParameters.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal));
        return true;
    }

    private static IReadOnlyDictionary<string, string?> NormalizeParameters(IReadOnlyDictionary<string, string?>? parameters)
    {
        return parameters is null
            ? new Dictionary<string, string?>(StringComparer.Ordinal)
            : parameters.ToDictionary(
                entry => entry.Key.Trim(),
                entry => entry.Value,
                StringComparer.Ordinal);
    }

    private static IReadOnlyDictionary<string, string?>? CaptureLegacyParameters(ApplyInterventionCommand command)
    {
        var parameters = new Dictionary<string, string?>(StringComparer.Ordinal);

        if (command.Presentation.FontFamily is not null)
        {
            parameters["fontFamily"] = ReadingPresentationRules.NormalizeFontFamily(command.Presentation.FontFamily);
        }

        if (command.Presentation.FontSizePx is not null)
        {
            parameters["fontSizePx"] = command.Presentation.FontSizePx.Value.ToString(CultureInfo.InvariantCulture);
        }

        if (command.Presentation.LineWidthPx is not null)
        {
            parameters["lineWidthPx"] = command.Presentation.LineWidthPx.Value.ToString(CultureInfo.InvariantCulture);
        }

        if (command.Presentation.LineHeight is not null)
        {
            parameters["lineHeight"] = command.Presentation.LineHeight.Value.ToString("0.##", CultureInfo.InvariantCulture);
        }

        if (command.Presentation.LetterSpacingEm is not null)
        {
            parameters["letterSpacingEm"] = command.Presentation.LetterSpacingEm.Value.ToString("0.##", CultureInfo.InvariantCulture);
        }

        if (command.Presentation.EditableByResearcher is not null)
        {
            parameters["editableByResearcher"] = command.Presentation.EditableByResearcher.Value.ToString().ToLowerInvariant();
        }

        if (command.Appearance.ThemeMode is not null)
        {
            parameters["themeMode"] = ReaderAppearanceRules.NormalizeThemeMode(command.Appearance.ThemeMode);
        }

        if (command.Appearance.Palette is not null)
        {
            parameters["palette"] = ReaderAppearanceRules.NormalizePalette(command.Appearance.Palette);
        }

        if (command.Appearance.AppFont is not null)
        {
            parameters["appFont"] = command.Appearance.AppFont.Trim();
        }

        return parameters.Count == 0 ? null : parameters;
    }

    private static void TryInfer(
        int? value,
        string moduleId,
        string parameterKey,
        Func<int, string> normalizeValue,
        ref string? inferredModuleId,
        ref bool hasMultipleLegacyFields,
        List<KeyValuePair<string, string?>> inferredParameters)
    {
        if (!value.HasValue)
        {
            return;
        }

        if (inferredModuleId is not null)
        {
            hasMultipleLegacyFields = true;
            return;
        }

        inferredModuleId = moduleId;
        inferredParameters.Add(new KeyValuePair<string, string?>(parameterKey, normalizeValue(value.Value)));
    }

    private static void TryInfer(
        string? value,
        string moduleId,
        string parameterKey,
        Func<string, string> normalizeValue,
        ref string? inferredModuleId,
        ref bool hasMultipleLegacyFields,
        List<KeyValuePair<string, string?>> inferredParameters)
    {
        if (value is null)
        {
            return;
        }

        if (inferredModuleId is not null)
        {
            hasMultipleLegacyFields = true;
            return;
        }

        inferredModuleId = moduleId;
        inferredParameters.Add(new KeyValuePair<string, string?>(parameterKey, normalizeValue(value)));
    }

    private static void TryInfer(
        double? value,
        string moduleId,
        string parameterKey,
        Func<double, string> normalizeValue,
        ref string? inferredModuleId,
        ref bool hasMultipleLegacyFields,
        List<KeyValuePair<string, string?>> inferredParameters)
    {
        if (!value.HasValue)
        {
            return;
        }

        if (inferredModuleId is not null)
        {
            hasMultipleLegacyFields = true;
            return;
        }

        inferredModuleId = moduleId;
        inferredParameters.Add(new KeyValuePair<string, string?>(parameterKey, normalizeValue(value.Value)));
    }

    private static void TryInfer(
        bool? value,
        string moduleId,
        string parameterKey,
        Func<bool, string> normalizeValue,
        ref string? inferredModuleId,
        ref bool hasMultipleLegacyFields,
        List<KeyValuePair<string, string?>> inferredParameters)
    {
        if (!value.HasValue)
        {
            return;
        }

        if (inferredModuleId is not null)
        {
            hasMultipleLegacyFields = true;
            return;
        }

        inferredModuleId = moduleId;
        inferredParameters.Add(new KeyValuePair<string, string?>(parameterKey, normalizeValue(value.Value)));
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
