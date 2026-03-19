import type { FontTheme } from "@/hooks/use-font-theme"

export type ReadingPresentationSettings = {
  fontFamily: FontTheme
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByExperimenter: boolean
}

type ReadingPresentationInput = Partial<Omit<ReadingPresentationSettings, "fontFamily">> & {
  fontFamily?: string | null
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 28
export const FONT_SIZE_STEP = 2
export const LINE_WIDTH_MIN = 520
export const LINE_WIDTH_MAX = 920
export const LINE_WIDTH_STEP = 20
export const LINE_HEIGHT_MIN = 1.2
export const LINE_HEIGHT_MAX = 2.2
export const LETTER_SPACING_MIN = 0
export const LETTER_SPACING_MAX = 0.12

export const DEFAULT_READING_PRESENTATION: ReadingPresentationSettings = {
  fontFamily: "merriweather",
  fontSizePx: 18,
  lineWidthPx: 680,
  lineHeight: 1.8,
  letterSpacingEm: 0,
  editableByExperimenter: true,
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}

export function normalizeFontTheme(value: string | null | undefined): FontTheme {
  if (
    value === "geist" ||
    value === "inter" ||
    value === "space-grotesk" ||
    value === "merriweather"
  ) {
    return value
  }

  return DEFAULT_READING_PRESENTATION.fontFamily
}

export function normalizeReadingPresentation(
  input: ReadingPresentationInput | null | undefined
): ReadingPresentationSettings {
  return {
    fontFamily: normalizeFontTheme(input?.fontFamily),
    fontSizePx: clamp(
      input?.fontSizePx ?? DEFAULT_READING_PRESENTATION.fontSizePx,
      FONT_SIZE_MIN,
      FONT_SIZE_MAX,
      DEFAULT_READING_PRESENTATION.fontSizePx
    ),
    lineWidthPx: clamp(
      input?.lineWidthPx ?? DEFAULT_READING_PRESENTATION.lineWidthPx,
      LINE_WIDTH_MIN,
      LINE_WIDTH_MAX,
      DEFAULT_READING_PRESENTATION.lineWidthPx
    ),
    lineHeight: clamp(
      input?.lineHeight ?? DEFAULT_READING_PRESENTATION.lineHeight,
      LINE_HEIGHT_MIN,
      LINE_HEIGHT_MAX,
      DEFAULT_READING_PRESENTATION.lineHeight
    ),
    letterSpacingEm: clamp(
      input?.letterSpacingEm ?? DEFAULT_READING_PRESENTATION.letterSpacingEm,
      LETTER_SPACING_MIN,
      LETTER_SPACING_MAX,
      DEFAULT_READING_PRESENTATION.letterSpacingEm
    ),
    editableByExperimenter:
      input?.editableByExperimenter ?? DEFAULT_READING_PRESENTATION.editableByExperimenter,
  }
}

export function applyReadingPresentationPatch(
  current: ReadingPresentationSettings,
  patch: ReadingPresentationInput
) {
  return normalizeReadingPresentation({
    ...current,
    ...patch,
  })
}
