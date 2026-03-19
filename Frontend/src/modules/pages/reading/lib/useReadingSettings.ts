"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { FontTheme } from "@/hooks/use-font-theme";
import {
  applyReadingPresentationPatch,
  DEFAULT_READING_PRESENTATION,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  LINE_WIDTH_STEP,
  normalizeFontTheme,
  type ReadingPresentationSettings,
} from "@/modules/pages/reading/lib/readingPresentation";

export {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  LINE_WIDTH_STEP,
} from "@/modules/pages/reading/lib/readingPresentation";

type StoredReadingPresentationSettings = ReadingPresentationSettings & {
  id: string
  name: string
}

const FONT_SIZE_KEY = "reading:fontSizePx";
const LINE_WIDTH_KEY = "reading:lineWidthPx";
const LINE_HEIGHT_KEY = "reading:lineHeight";
const LETTER_SPACING_KEY = "reading:letterSpacingEm";
const FONT_FAMILY_KEY = "reading:fontFamily";
const EDITABLE_BY_EXPERIMENTER_KEY = "reading:editableByExperimenter";
const EXPERIMENT_SETUP_ID_KEY = "reading:experimentSetupId";
const EXPERIMENT_SETUP_NAME_KEY = "reading:experimentSetupName";

const settingsListeners = new Set<() => void>();

function emitSettingsChange() {
  for (const listener of settingsListeners) {
    listener();
  }
}

function subscribeToReadingSettings(listener: () => void) {
  settingsListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      settingsListeners.delete(listener);
    };
  }

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) {
      return;
    }

    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    settingsListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readStoredNumber(key: string): number | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readStoredString(key: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(key) ?? undefined;
}

function readStoredBoolean(key: string): boolean | undefined {
  const value = readStoredString(key);
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function writeStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
  emitSettingsChange();
}

function removeStoredValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  emitSettingsChange();
}

function clampRange(value: number | undefined, min: number, max: number, fallback: number) {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function getFontSizeSnapshot() {
  return clampRange(readStoredNumber(FONT_SIZE_KEY), FONT_SIZE_MIN, FONT_SIZE_MAX, DEFAULT_READING_PRESENTATION.fontSizePx);
}

function getLineWidthSnapshot() {
  return clampRange(readStoredNumber(LINE_WIDTH_KEY), LINE_WIDTH_MIN, LINE_WIDTH_MAX, DEFAULT_READING_PRESENTATION.lineWidthPx);
}

function getLineHeightSnapshot() {
  return clampRange(readStoredNumber(LINE_HEIGHT_KEY), 1.2, 2.2, DEFAULT_READING_PRESENTATION.lineHeight);
}

function getLetterSpacingSnapshot() {
  return clampRange(readStoredNumber(LETTER_SPACING_KEY), 0, 0.12, DEFAULT_READING_PRESENTATION.letterSpacingEm);
}

function getFontFamilySnapshot(): FontTheme {
  return normalizeFontTheme(readStoredString(FONT_FAMILY_KEY));
}

function getEditableByExperimenterSnapshot() {
  return readStoredBoolean(EDITABLE_BY_EXPERIMENTER_KEY) ?? DEFAULT_READING_PRESENTATION.editableByExperimenter;
}

function getExperimentSetupIdSnapshot() {
  return readStoredString(EXPERIMENT_SETUP_ID_KEY) ?? null;
}

function getExperimentSetupNameSnapshot() {
  return readStoredString(EXPERIMENT_SETUP_NAME_KEY) ?? null;
}

export function applyReadingPresentationSettings(setup: StoredReadingPresentationSettings) {
  writeStoredValue(FONT_SIZE_KEY, String(setup.fontSizePx));
  writeStoredValue(LINE_WIDTH_KEY, String(setup.lineWidthPx));
  writeStoredValue(LINE_HEIGHT_KEY, String(setup.lineHeight));
  writeStoredValue(LETTER_SPACING_KEY, String(setup.letterSpacingEm));
  writeStoredValue(FONT_FAMILY_KEY, setup.fontFamily);
  writeStoredValue(EDITABLE_BY_EXPERIMENTER_KEY, String(setup.editableByExperimenter));
  writeStoredValue(EXPERIMENT_SETUP_ID_KEY, setup.id);
  writeStoredValue(EXPERIMENT_SETUP_NAME_KEY, setup.name);
}

export function clearAppliedExperimentSetup() {
  removeStoredValue(EXPERIMENT_SETUP_ID_KEY);
  removeStoredValue(EXPERIMENT_SETUP_NAME_KEY);
  removeStoredValue(EDITABLE_BY_EXPERIMENTER_KEY);
}

export function useReadingSettings() {
  const fontSizePx = useSyncExternalStore(
    subscribeToReadingSettings,
    getFontSizeSnapshot,
    () => DEFAULT_READING_PRESENTATION.fontSizePx
  );
  const lineWidthPx = useSyncExternalStore(
    subscribeToReadingSettings,
    getLineWidthSnapshot,
    () => DEFAULT_READING_PRESENTATION.lineWidthPx
  );
  const lineHeight = useSyncExternalStore(
    subscribeToReadingSettings,
    getLineHeightSnapshot,
    () => DEFAULT_READING_PRESENTATION.lineHeight
  );
  const letterSpacingEm = useSyncExternalStore(
    subscribeToReadingSettings,
    getLetterSpacingSnapshot,
    () => DEFAULT_READING_PRESENTATION.letterSpacingEm
  );
  const fontFamily = useSyncExternalStore(
    subscribeToReadingSettings,
    getFontFamilySnapshot,
    () => DEFAULT_READING_PRESENTATION.fontFamily
  );
  const editableByExperimenter = useSyncExternalStore(
    subscribeToReadingSettings,
    getEditableByExperimenterSnapshot,
    () => DEFAULT_READING_PRESENTATION.editableByExperimenter
  );
  const experimentSetupId = useSyncExternalStore(
    subscribeToReadingSettings,
    getExperimentSetupIdSnapshot,
    () => null
  );
  const experimentSetupName = useSyncExternalStore(
    subscribeToReadingSettings,
    getExperimentSetupNameSnapshot,
    () => null
  );

  const setFontSizePx = useCallback((value: number) => {
    writeStoredValue(FONT_SIZE_KEY, String(clampRange(value, FONT_SIZE_MIN, FONT_SIZE_MAX, DEFAULT_READING_PRESENTATION.fontSizePx)));
  }, []);

  const setLineWidthPx = useCallback((value: number) => {
    writeStoredValue(LINE_WIDTH_KEY, String(clampRange(value, LINE_WIDTH_MIN, LINE_WIDTH_MAX, DEFAULT_READING_PRESENTATION.lineWidthPx)));
  }, []);

  const setLineHeight = useCallback((value: number) => {
    writeStoredValue(LINE_HEIGHT_KEY, String(clampRange(value, 1.2, 2.2, DEFAULT_READING_PRESENTATION.lineHeight)));
  }, []);

  const setLetterSpacingEm = useCallback((value: number) => {
    writeStoredValue(
      LETTER_SPACING_KEY,
      String(clampRange(value, 0, 0.12, DEFAULT_READING_PRESENTATION.letterSpacingEm))
    );
  }, []);

  const setFontFamily = useCallback((value: FontTheme) => {
    writeStoredValue(FONT_FAMILY_KEY, value);
  }, []);

  const setEditableByExperimenter = useCallback((value: boolean) => {
    writeStoredValue(EDITABLE_BY_EXPERIMENTER_KEY, String(value));
  }, []);

  const increaseFontSize = useCallback(() => {
    writeStoredValue(
      FONT_SIZE_KEY,
      String(clampRange(fontSizePx + FONT_SIZE_STEP, FONT_SIZE_MIN, FONT_SIZE_MAX, DEFAULT_READING_PRESENTATION.fontSizePx))
    );
  }, [fontSizePx]);

  const decreaseFontSize = useCallback(() => {
    writeStoredValue(
      FONT_SIZE_KEY,
      String(clampRange(fontSizePx - FONT_SIZE_STEP, FONT_SIZE_MIN, FONT_SIZE_MAX, DEFAULT_READING_PRESENTATION.fontSizePx))
    );
  }, [fontSizePx]);

  const increaseLineWidth = useCallback(() => {
    writeStoredValue(
      LINE_WIDTH_KEY,
      String(clampRange(lineWidthPx + LINE_WIDTH_STEP, LINE_WIDTH_MIN, LINE_WIDTH_MAX, DEFAULT_READING_PRESENTATION.lineWidthPx))
    );
  }, [lineWidthPx]);

  const decreaseLineWidth = useCallback(() => {
    writeStoredValue(
      LINE_WIDTH_KEY,
      String(clampRange(lineWidthPx - LINE_WIDTH_STEP, LINE_WIDTH_MIN, LINE_WIDTH_MAX, DEFAULT_READING_PRESENTATION.lineWidthPx))
    );
  }, [lineWidthPx]);

  const resetReadingSettings = useCallback(() => {
    writeStoredValue(FONT_SIZE_KEY, String(DEFAULT_READING_PRESENTATION.fontSizePx));
    writeStoredValue(LINE_WIDTH_KEY, String(DEFAULT_READING_PRESENTATION.lineWidthPx));
    writeStoredValue(LINE_HEIGHT_KEY, String(DEFAULT_READING_PRESENTATION.lineHeight));
    writeStoredValue(LETTER_SPACING_KEY, String(DEFAULT_READING_PRESENTATION.letterSpacingEm));
    writeStoredValue(FONT_FAMILY_KEY, DEFAULT_READING_PRESENTATION.fontFamily);
    writeStoredValue(EDITABLE_BY_EXPERIMENTER_KEY, String(DEFAULT_READING_PRESENTATION.editableByExperimenter));
    removeStoredValue(EXPERIMENT_SETUP_ID_KEY);
    removeStoredValue(EXPERIMENT_SETUP_NAME_KEY);
  }, []);

  const presentation = applyReadingPresentationPatch(DEFAULT_READING_PRESENTATION, {
    fontFamily,
    fontSizePx,
    lineWidthPx,
    lineHeight,
    letterSpacingEm,
    editableByExperimenter,
  })

  return {
    presentation,
    fontFamily,
    fontSizePx,
    lineWidthPx,
    lineHeight,
    letterSpacingEm,
    editableByExperimenter,
    experimentSetupId,
    experimentSetupName,
    setFontFamily,
    setFontSizePx,
    setLineWidthPx,
    setLineHeight,
    setLetterSpacingEm,
    setEditableByExperimenter,
    increaseFontSize,
    decreaseFontSize,
    increaseLineWidth,
    decreaseLineWidth,
    resetReadingSettings,
  };
}
