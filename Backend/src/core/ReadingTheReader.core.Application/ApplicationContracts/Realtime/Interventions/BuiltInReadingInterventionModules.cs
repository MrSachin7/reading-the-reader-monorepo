using System.Globalization;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public static class BuiltInReadingInterventionModules
{
    public const int ManagedFontSizeMin = 14;
    public const int ManagedFontSizeMax = 28;
    public const int ManagedLineWidthMin = 520;
    public const int ManagedLineWidthMax = 920;
    public const double ManagedLineHeightMin = 1.2;
    public const double ManagedLineHeightMax = 2.2;
    public const double ManagedLetterSpacingMin = 0;
    public const double ManagedLetterSpacingMax = 0.12;

    public static IReadOnlyList<IReadingInterventionModule> All { get; } =
    [
        CreateFontFamilyModule(),
        CreateFontSizeModule(),
        CreateLineWidthModule(),
        CreateLineHeightModule(),
        CreateLetterSpacingModule(),
        CreateThemeModeModule(),
        CreatePaletteModule(),
        CreateParticipantEditLockModule()
    ];

    private static IReadingInterventionModule CreateFontFamilyModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "fontFamily",
            "Font family",
            "Typeface used for the participant reading surface.",
            ReadingInterventionValueKinds.String,
            true,
            ReadingPresentationSnapshot.Default.FontFamily,
            Options:
            [
                new("roboto-flex", "Roboto Flex"),
                new("geist", "Geist"),
                new("inter", "Inter"),
                new("space-grotesk", "Space Grotesk"),
                new("merriweather", "Merriweather")
            ]);

        return new SingleParameterReadingInterventionModule<string>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.FontFamily,
                "Font family",
                "Changes the participant reading font family.",
                "presentation",
                10,
                [parameter]),
            parameter,
            ParseFontFamily,
            (context, value) => (
                context.CurrentPresentation with { FontFamily = value },
                context.CurrentAppearance));
    }

    private static IReadingInterventionModule CreateFontSizeModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "fontSizePx",
            "Font size",
            "Font size in pixels for participant reading text.",
            ReadingInterventionValueKinds.Integer,
            true,
            ReadingPresentationSnapshot.Default.FontSizePx.ToString(CultureInfo.InvariantCulture),
            "px",
            ManagedFontSizeMin,
            ManagedFontSizeMax,
            2);

        return new SingleParameterReadingInterventionModule<int>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.FontSize,
                "Font size",
                "Changes the participant reading font size.",
                "presentation",
                20,
                [parameter]),
            parameter,
            raw => ParseInt(raw, min: ManagedFontSizeMin, max: ManagedFontSizeMax),
            (context, value) => (
                context.CurrentPresentation with { FontSizePx = value },
                context.CurrentAppearance));
    }

    private static IReadingInterventionModule CreateLineWidthModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "lineWidthPx",
            "Line width",
            "Maximum reading line width in pixels.",
            ReadingInterventionValueKinds.Integer,
            true,
            ReadingPresentationSnapshot.Default.LineWidthPx.ToString(CultureInfo.InvariantCulture),
            "px",
            ManagedLineWidthMin,
            ManagedLineWidthMax,
            20);

        return new SingleParameterReadingInterventionModule<int>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.LineWidth,
                "Line width",
                "Changes the participant reading line width.",
                "presentation",
                30,
                [parameter]),
            parameter,
            raw => ParseInt(raw, min: ManagedLineWidthMin, max: ManagedLineWidthMax),
            (context, value) => (
                context.CurrentPresentation with { LineWidthPx = value },
                context.CurrentAppearance));
    }

    private static IReadingInterventionModule CreateLineHeightModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "lineHeight",
            "Line height",
            "Line height multiplier for participant reading text.",
            ReadingInterventionValueKinds.Number,
            true,
            ReadingPresentationSnapshot.Default.LineHeight.ToString("0.##", CultureInfo.InvariantCulture),
            null,
            ManagedLineHeightMin,
            ManagedLineHeightMax,
            0.05);

        return new SingleParameterReadingInterventionModule<double>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.LineHeight,
                "Line height",
                "Changes the participant reading line height.",
                "presentation",
                40,
                [parameter]),
            parameter,
            raw => ParseDouble(raw, min: ManagedLineHeightMin, max: ManagedLineHeightMax),
            (context, value) => (
                context.CurrentPresentation with { LineHeight = value },
                context.CurrentAppearance));
    }

    private static IReadingInterventionModule CreateLetterSpacingModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "letterSpacingEm",
            "Letter spacing",
            "Letter spacing adjustment in em units.",
            ReadingInterventionValueKinds.Number,
            true,
            ReadingPresentationSnapshot.Default.LetterSpacingEm.ToString("0.##", CultureInfo.InvariantCulture),
            "em",
            ManagedLetterSpacingMin,
            ManagedLetterSpacingMax,
            0.01);

        return new SingleParameterReadingInterventionModule<double>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.LetterSpacing,
                "Letter spacing",
                "Changes the participant reading letter spacing.",
                "presentation",
                50,
                [parameter]),
            parameter,
            raw => ParseDouble(raw, min: ManagedLetterSpacingMin, max: ManagedLetterSpacingMax),
            (context, value) => (
                context.CurrentPresentation with { LetterSpacingEm = value },
                context.CurrentAppearance));
    }

    private static IReadingInterventionModule CreateThemeModeModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "themeMode",
            "Theme mode",
            "Color mode for the participant reading surface.",
            ReadingInterventionValueKinds.String,
            true,
            ReaderAppearanceSnapshot.Default.ThemeMode,
            Options:
            [
                new("light", "Light"),
                new("dark", "Dark")
            ]);

        return new SingleParameterReadingInterventionModule<string>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.ThemeMode,
                "Theme mode",
                "Changes the participant reading theme mode.",
                "appearance",
                60,
                [parameter]),
            parameter,
            ParseThemeMode,
            (context, value) => (
                context.CurrentPresentation,
                context.CurrentAppearance with { ThemeMode = value }));
    }

    private static IReadingInterventionModule CreatePaletteModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "palette",
            "Color palette",
            "Palette applied to the participant reading surface.",
            ReadingInterventionValueKinds.String,
            true,
            ReaderAppearanceSnapshot.Default.Palette,
            Options:
            [
                new("default", "Default"),
                new("sepia", "Sepia"),
                new("high-contrast", "High contrast")
            ]);

        return new SingleParameterReadingInterventionModule<string>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.Palette,
                "Color palette",
                "Changes the participant reading palette.",
                "appearance",
                70,
                [parameter]),
            parameter,
            ParsePalette,
            (context, value) => (
                context.CurrentPresentation,
                context.CurrentAppearance with { Palette = value }));
    }

    private static IReadingInterventionModule CreateParticipantEditLockModule()
    {
        var parameter = new ReadingInterventionParameterDescriptor(
            "locked",
            "Participant editing locked",
            "Whether the participant can change presentation controls locally.",
            ReadingInterventionValueKinds.Boolean,
            true,
            bool.FalseString.ToLowerInvariant());

        return new SingleParameterReadingInterventionModule<bool>(
            new ReadingInterventionModuleDescriptor(
                ReadingInterventionModuleIds.ParticipantEditLock,
                "Participant edit lock",
                "Locks or unlocks participant-side presentation changes.",
                "permissions",
                80,
                [parameter]),
            parameter,
            ParseBoolean,
            (context, value) => (
                context.CurrentPresentation with { EditableByResearcher = !value },
                context.CurrentAppearance));
    }

    private static ParameterParseResult<string> ParseFontFamily(string? rawValue)
    {
        var normalized = ReadingPresentationRules.NormalizeFontFamily(rawValue);

        return normalized switch
        {
            "roboto-flex" or "geist" or "inter" or "space-grotesk" or "merriweather" => ParameterParseResult<string>.Success(normalized, normalized),
            _ => ParameterParseResult<string>.Failure("Font family must be one of: roboto-flex, geist, inter, space-grotesk, merriweather.")
        };
    }

    private static ParameterParseResult<string> ParseThemeMode(string? rawValue)
    {
        if (string.Equals(rawValue?.Trim(), "light", StringComparison.OrdinalIgnoreCase))
        {
            return ParameterParseResult<string>.Success("light", "light");
        }

        if (string.Equals(rawValue?.Trim(), "dark", StringComparison.OrdinalIgnoreCase))
        {
            return ParameterParseResult<string>.Success("dark", "dark");
        }

        return ParameterParseResult<string>.Failure("Theme mode must be 'light' or 'dark'.");
    }

    private static ParameterParseResult<string> ParsePalette(string? rawValue)
    {
        var normalized = rawValue?.Trim();

        return normalized switch
        {
            "default" or "sepia" or "high-contrast" => ParameterParseResult<string>.Success(normalized, normalized),
            _ => ParameterParseResult<string>.Failure("Palette must be one of: default, sepia, high-contrast.")
        };
    }

    private static ParameterParseResult<bool> ParseBoolean(string? rawValue)
    {
        if (!bool.TryParse(rawValue?.Trim(), out var value))
        {
            return ParameterParseResult<bool>.Failure("Boolean parameter must be 'true' or 'false'.");
        }

        return ParameterParseResult<bool>.Success(value, value ? "true" : "false");
    }

    private static ParameterParseResult<int> ParseInt(string? rawValue, int min, int max)
    {
        if (!int.TryParse(rawValue?.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
        {
            return ParameterParseResult<int>.Failure("Parameter must be a whole number.");
        }

        if (value < min || value > max)
        {
            return ParameterParseResult<int>.Failure($"Parameter must be between {min} and {max}.");
        }

        return ParameterParseResult<int>.Success(value, value.ToString(CultureInfo.InvariantCulture));
    }

    private static ParameterParseResult<double> ParseDouble(string? rawValue, double min, double max)
    {
        if (!double.TryParse(rawValue?.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return ParameterParseResult<double>.Failure("Parameter must be a number.");
        }

        if (value < min || value > max)
        {
            return ParameterParseResult<double>.Failure(
                $"Parameter must be between {min.ToString("0.##", CultureInfo.InvariantCulture)} and {max.ToString("0.##", CultureInfo.InvariantCulture)}.");
        }

        return ParameterParseResult<double>.Success(
            value,
            value.ToString("0.##", CultureInfo.InvariantCulture));
    }

    private sealed record ParameterParseResult<TValue>(
        bool IsValid,
        TValue? Value,
        string? NormalizedValue,
        string? ErrorMessage)
    {
        public static ParameterParseResult<TValue> Success(TValue value, string normalizedValue)
        {
            return new ParameterParseResult<TValue>(true, value, normalizedValue, null);
        }

        public static ParameterParseResult<TValue> Failure(string errorMessage)
        {
            return new ParameterParseResult<TValue>(false, default, null, errorMessage);
        }
    }

    private sealed class SingleParameterReadingInterventionModule<TValue> : IReadingInterventionModule
    {
        private readonly ReadingInterventionParameterDescriptor _parameter;
        private readonly Func<string?, ParameterParseResult<TValue>> _parse;
        private readonly Func<ReadingInterventionExecutionContext, TValue, (ReadingPresentationSnapshot Presentation, ReaderAppearanceSnapshot Appearance)> _apply;

        public SingleParameterReadingInterventionModule(
            ReadingInterventionModuleDescriptor descriptor,
            ReadingInterventionParameterDescriptor parameter,
            Func<string?, ParameterParseResult<TValue>> parse,
            Func<ReadingInterventionExecutionContext, TValue, (ReadingPresentationSnapshot Presentation, ReaderAppearanceSnapshot Appearance)> apply)
        {
            Descriptor = descriptor;
            _parameter = parameter;
            _parse = parse;
            _apply = apply;
        }

        public ReadingInterventionModuleDescriptor Descriptor { get; }

        public ReadingInterventionValidationResult Validate(ReadingInterventionRequest request)
        {
            if (!string.Equals(request.ModuleId, Descriptor.ModuleId, StringComparison.Ordinal))
            {
                return new ReadingInterventionValidationResult(
                    false,
                    $"Request module '{request.ModuleId}' does not match '{Descriptor.ModuleId}'.",
                    new Dictionary<string, string?>());
            }

            if (!request.Parameters.TryGetValue(_parameter.Key, out var rawValue))
            {
                return new ReadingInterventionValidationResult(
                    false,
                    $"Module '{Descriptor.ModuleId}' requires parameter '{_parameter.Key}'.",
                    new Dictionary<string, string?>());
            }

            var parsed = _parse(rawValue);
            if (!parsed.IsValid || parsed.NormalizedValue is null)
            {
                return new ReadingInterventionValidationResult(
                    false,
                    parsed.ErrorMessage ?? $"Invalid value for parameter '{_parameter.Key}'.",
                    new Dictionary<string, string?>());
            }

            return new ReadingInterventionValidationResult(
                true,
                null,
                new Dictionary<string, string?>(StringComparer.Ordinal)
                {
                    [_parameter.Key] = parsed.NormalizedValue
                });
        }

        public ReadingInterventionModuleExecutionResult Execute(
            ReadingInterventionExecutionContext context,
            ReadingInterventionRequest request)
        {
            var validation = Validate(request);
            if (!validation.IsValid || !validation.NormalizedParameters.TryGetValue(_parameter.Key, out _))
            {
                throw new ArgumentException(
                    validation.ErrorMessage ?? $"Invalid request for intervention module '{Descriptor.ModuleId}'.",
                    nameof(request));
            }

            var parsed = _parse(request.Parameters[_parameter.Key]);
            if (!parsed.IsValid || parsed.Value is null)
            {
                throw new ArgumentException(
                    parsed.ErrorMessage ?? $"Invalid request for intervention module '{Descriptor.ModuleId}'.",
                    nameof(request));
            }

            var (presentation, appearance) = _apply(context, parsed.Value);

            return new ReadingInterventionModuleExecutionResult(
                ReadingPresentationRules.Normalize(presentation),
                ReaderAppearanceRules.Normalize(appearance),
                validation.NormalizedParameters);
        }
    }
}
