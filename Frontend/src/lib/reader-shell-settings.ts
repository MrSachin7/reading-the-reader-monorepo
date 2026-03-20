export type ReaderShellViewSettings = {
  preserveContextOnIntervention: boolean
  highlightContext: boolean
  displayGazePosition: boolean
  highlightTokensBeingLookedAt: boolean
  showFixationHeatmap: boolean
  showToolbar: boolean
  showBackButton: boolean
  showLixScores: boolean
}

export type ReaderShellSettingsSnapshot = {
  reading: ReaderShellViewSettings
  researcherMirror: ReaderShellViewSettings
  replay: ReaderShellViewSettings
}

export type ReaderShellSettingsViewKey = keyof ReaderShellSettingsSnapshot
export type ReaderShellOptionKey = keyof ReaderShellViewSettings

export const READER_SHELL_SETTINGS_VIEW_KEYS = [
  "reading",
  "researcherMirror",
  "replay",
] as const satisfies readonly ReaderShellSettingsViewKey[]

export const READER_SHELL_SETTINGS_DEFAULTS: ReaderShellSettingsSnapshot = {
  reading: {
    preserveContextOnIntervention: true,
    highlightContext: false,
    displayGazePosition: false,
    highlightTokensBeingLookedAt: true,
    showFixationHeatmap: false,
    showToolbar: false,
    showBackButton: false,
    showLixScores: false,
  },
  researcherMirror: {
    preserveContextOnIntervention: true,
    highlightContext: true,
    displayGazePosition: false,
    highlightTokensBeingLookedAt: false,
    showFixationHeatmap: false,
    showToolbar: false,
    showBackButton: false,
    showLixScores: false,
  },
  replay: {
    preserveContextOnIntervention: true,
    highlightContext: true,
    displayGazePosition: true,
    highlightTokensBeingLookedAt: true,
    showFixationHeatmap: false,
    showToolbar: false,
    showBackButton: true,
    showLixScores: true,
  },
}

export function cloneReaderShellViewSettings(
  settings: ReaderShellViewSettings
): ReaderShellViewSettings {
  return { ...settings }
}

export function cloneReaderShellSettingsSnapshot(
  snapshot: ReaderShellSettingsSnapshot
): ReaderShellSettingsSnapshot {
  return {
    reading: cloneReaderShellViewSettings(snapshot.reading),
    researcherMirror: cloneReaderShellViewSettings(snapshot.researcherMirror),
    replay: cloneReaderShellViewSettings(snapshot.replay),
  }
}

export function getReaderShellViewSettings(
  snapshot: ReaderShellSettingsSnapshot | undefined,
  view: ReaderShellSettingsViewKey
): ReaderShellViewSettings {
  return cloneReaderShellViewSettings(snapshot?.[view] ?? READER_SHELL_SETTINGS_DEFAULTS[view])
}

export function countEnabledReaderShellOptions(settings: ReaderShellViewSettings) {
  return Object.values(settings).filter(Boolean).length
}
