import { normalizeFontTheme } from "@/modules/pages/reading/lib/readingPresentation"

export const READER_THEME_MODES = ["light", "dark"] as const
export type ReaderThemeMode = (typeof READER_THEME_MODES)[number]

export type ReaderAppearanceSettings = {
  themeMode: ReaderThemeMode
  palette: "default" | "sepia" | "high-contrast"
  appFont: ReturnType<typeof normalizeFontTheme>
}

type ReaderAppearanceInput = {
  themeMode?: string | null
  palette?: string | null
  appFont?: string | null
}

export const DEFAULT_READER_APPEARANCE: ReaderAppearanceSettings = {
  themeMode: "light",
  palette: "default",
  appFont: "roboto-flex",
}

export function normalizeReaderThemeMode(value: string | null | undefined): ReaderThemeMode {
  return value === "dark" ? "dark" : DEFAULT_READER_APPEARANCE.themeMode
}

export function normalizeReaderPalette(
  value: string | null | undefined
): ReaderAppearanceSettings["palette"] {
  if (value === "sepia" || value === "high-contrast") {
    return value
  }

  return DEFAULT_READER_APPEARANCE.palette
}

export function normalizeReaderAppearance(
  input: ReaderAppearanceInput | null | undefined
): ReaderAppearanceSettings {
  return {
    themeMode: normalizeReaderThemeMode(input?.themeMode),
    palette: normalizeReaderPalette(input?.palette),
    appFont: normalizeFontTheme(input?.appFont, DEFAULT_READER_APPEARANCE.appFont),
  }
}
