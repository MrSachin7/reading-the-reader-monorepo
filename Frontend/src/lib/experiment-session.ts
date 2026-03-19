import type { CalibrationSessionSnapshot } from "@/lib/calibration"

export type ExperimentSetupSnapshot = {
  eyeTrackerSetupCompleted: boolean
  participantSetupCompleted: boolean
  calibrationCompleted: boolean
  readingMaterialSetupCompleted: boolean
  currentStepIndex: number
}

export type ExperimentParticipantSnapshot = {
  name: string
  age: number
  sex: string
  existingEyeCondition: string
  readingProficiency: string
}

export type ExperimentEyeTrackerSnapshot = {
  name: string
  model: string
  serialNumber: string
  hasSavedLicence: boolean
}

export type ReadingPresentationSnapshot = {
  fontFamily: string
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByResearcher: boolean
}

export type ReadingContentSnapshot = {
  documentId: string
  title: string
  markdown: string
  sourceSetupId: string | null
  updatedAtUnixMs: number
}

export type ParticipantViewportSnapshot = {
  isConnected: boolean
  scrollProgress: number
  viewportWidthPx: number
  viewportHeightPx: number
  contentHeightPx: number
  contentWidthPx: number
  updatedAtUnixMs: number
}

export type ReadingFocusSnapshot = {
  isInsideReadingArea: boolean
  normalizedContentX: number | null
  normalizedContentY: number | null
  activeTokenId: string | null
  activeBlockId: string | null
  updatedAtUnixMs: number
}

export type InterventionEventSnapshot = {
  id: string
  source: string
  trigger: string
  reason: string
  appliedAtUnixMs: number
  appliedPresentation: ReadingPresentationSnapshot
}

export type LiveReadingSessionSnapshot = {
  content: ReadingContentSnapshot | null
  presentation: ReadingPresentationSnapshot
  participantViewport: ParticipantViewportSnapshot
  focus: ReadingFocusSnapshot
  latestIntervention: InterventionEventSnapshot | null
  recentInterventions: InterventionEventSnapshot[]
}

export type ExperimentSessionSnapshot = {
  sessionId: string | null
  isActive: boolean
  startedAtUnixMs: number
  stoppedAtUnixMs: number | null
  participant: ExperimentParticipantSnapshot | null
  eyeTrackerDevice: ExperimentEyeTrackerSnapshot | null
  calibration: CalibrationSessionSnapshot
  setup: ExperimentSetupSnapshot
  receivedGazeSamples: number
  latestGazeSample: unknown
  connectedClients: number
  readingSession: LiveReadingSessionSnapshot | null
}

export const EMPTY_READING_SESSION: LiveReadingSessionSnapshot = {
  content: null,
  presentation: {
    fontFamily: "merriweather",
    fontSizePx: 18,
    lineWidthPx: 680,
    lineHeight: 1.8,
    letterSpacingEm: 0,
    editableByResearcher: true,
  },
  participantViewport: {
    isConnected: false,
    scrollProgress: 0,
    viewportWidthPx: 0,
    viewportHeightPx: 0,
    contentHeightPx: 0,
    contentWidthPx: 0,
    updatedAtUnixMs: 0,
  },
  focus: {
    isInsideReadingArea: false,
    normalizedContentX: null,
    normalizedContentY: null,
    activeTokenId: null,
    activeBlockId: null,
    updatedAtUnixMs: 0,
  },
  latestIntervention: null,
  recentInterventions: [],
}
