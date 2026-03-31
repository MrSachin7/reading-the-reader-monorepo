import type { CalibrationQuality, CalibrationSessionSnapshot } from "@/lib/calibration"
import type { InterventionParameterValues } from "@/lib/intervention-modules"
import type { ReadingAttentionSummarySnapshot } from "@/lib/reading-attention-summary"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"

export type ExperimentSetupBlockerSnapshot = {
  stepKey: string
  stepLabel: string
  reason: string
}

export type EyeTrackerSetupReadinessSnapshot = {
  isReady: boolean
  hasSelectedEyeTracker: boolean
  hasAppliedLicence: boolean
  hasSavedLicence: boolean
  savedLicenceMissing: boolean
  selectedTrackerSerialNumber: string | null
  selectedTrackerName: string | null
  blockReason: string | null
}

export type ParticipantSetupReadinessSnapshot = {
  isReady: boolean
  hasParticipant: boolean
  participantName: string | null
  blockReason: string | null
}

export type CalibrationSetupReadinessSnapshot = {
  isReady: boolean
  hasCalibrationSession: boolean
  isCalibrationApplied: boolean
  isValidationPassed: boolean
  status: string
  validationStatus: string
  validationQuality: CalibrationQuality | null
  averageAccuracyDegrees: number | null
  averagePrecisionDegrees: number | null
  sampleCount: number
  blockReason: string | null
}

export type ReadingMaterialSetupReadinessSnapshot = {
  isReady: boolean
  hasReadingMaterial: boolean
  documentId: string | null
  title: string | null
  sourceSetupId: string | null
  usesSavedSetup: boolean
  configuredAtUnixMs: number | null
  allowsResearcherPresentationChanges: boolean
  isPresentationLocked: boolean
  blockReason: string | null
}

export type ExperimentSetupSnapshot = {
  isReadyForSessionStart: boolean
  currentStepIndex: number
  currentBlocker: ExperimentSetupBlockerSnapshot | null
  eyeTracker: EyeTrackerSetupReadinessSnapshot
  participant: ParticipantSetupReadinessSnapshot
  calibration: CalibrationSetupReadinessSnapshot
  readingMaterial: ReadingMaterialSetupReadinessSnapshot
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
  isPresentationLocked?: boolean
}

export type ReaderAppearanceSnapshot = ReaderAppearanceSettings

export type ReadingContentSnapshot = {
  documentId: string
  title: string
  markdown: string
  sourceSetupId: string | null
  updatedAtUnixMs: number
  usesSavedSetup?: boolean
}

export type ParticipantViewportSnapshot = {
  isConnected: boolean
  scrollProgress: number
  scrollTopPx: number
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
  appliedAppearance: ReaderAppearanceSnapshot
  moduleId: string | null
  parameters: InterventionParameterValues | null
}

export type DecisionConfiguration = {
  conditionLabel: string
  providerId: string
  executionMode: string
}

export type DecisionSignalSnapshot = {
  signalType: string
  summary: string
  observedAtUnixMs: number
  confidence: number | null
}

export type DecisionProposalIntervention = {
  source: string
  trigger: string
  reason: string
  moduleId: string | null
  parameters: InterventionParameterValues | null
  presentation: {
    fontFamily: string | null
    fontSizePx: number | null
    lineWidthPx: number | null
    lineHeight: number | null
    letterSpacingEm: number | null
    editableByResearcher: boolean | null
  }
  appearance: {
    themeMode: string | null
    palette: string | null
    appFont: string | null
  }
}

export type DecisionProposalSnapshot = {
  proposalId: string
  conditionLabel: string
  providerId: string
  executionMode: string
  status: string
  signal: DecisionSignalSnapshot
  rationale: string
  proposedAtUnixMs: number
  resolvedAtUnixMs: number | null
  resolutionSource: string | null
  appliedInterventionId: string | null
  proposedIntervention: DecisionProposalIntervention
}

export type DecisionState = {
  automationPaused: boolean
  activeProposal: DecisionProposalSnapshot | null
  recentProposalHistory: DecisionProposalSnapshot[]
}

export type LiveReadingSessionSnapshot = {
  content: ReadingContentSnapshot | null
  presentation: ReadingPresentationSnapshot
  appearance: ReaderAppearanceSnapshot
  participantViewport: ParticipantViewportSnapshot
  focus: ReadingFocusSnapshot
  latestIntervention: InterventionEventSnapshot | null
  recentInterventions: InterventionEventSnapshot[]
  attentionSummary: ReadingAttentionSummarySnapshot | null
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
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
}

export type DecisionRealtimeUpdate = {
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
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
  appearance: {
    themeMode: "light",
    palette: "default",
    appFont: "geist",
  },
  participantViewport: {
    isConnected: false,
    scrollProgress: 0,
    scrollTopPx: 0,
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
  attentionSummary: null,
}

export const EMPTY_DECISION_CONFIGURATION: DecisionConfiguration = {
  conditionLabel: "Manual only",
  providerId: "manual",
  executionMode: "advisory",
}

export const EMPTY_DECISION_STATE: DecisionState = {
  automationPaused: false,
  activeProposal: null,
  recentProposalHistory: [],
}
