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

export type ExperimentLiveMonitoringSnapshot = {
  canStartSession: boolean
  canFinishSession: boolean
  isGazeStreamingActive: boolean
  gazeSubscriberCount: number
  hasParticipantViewConnection: boolean
  hasParticipantViewportData: boolean
  participantViewportUpdatedAtUnixMs: number | null
  hasReadingFocusSignal: boolean
  focusUpdatedAtUnixMs: number | null
}

export type ExternalProviderStatusSnapshot = {
  isConnected: boolean
  status: string
  providerId: string | null
  displayName: string | null
  supportsAdvisoryExecution: boolean
  supportsAutonomousExecution: boolean
  supportedInterventionModuleIds: string[]
  lastHeartbeatAtUnixMs: number | null
}

export type EyeMovementAnalysisProviderStatusSnapshot = {
  isConnected: boolean
  status: string
  providerId: string | null
  displayName: string | null
  lastHeartbeatAtUnixMs: number | null
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
  activePageIndex: number
  pageCount: number
  lastPageTurnAtUnixMs: number | null
}

export type ReadingFocusSnapshot = {
  isInsideReadingArea: boolean
  normalizedContentX: number | null
  normalizedContentY: number | null
  activeTokenId: string | null
  activeBlockId: string | null
  activeSentenceId: string | null
  updatedAtUnixMs: number
}

export type ReadingInterventionCommitBoundary =
  | "immediate"
  | "sentence-end"
  | "paragraph-end"
  | "page-turn"

export type ReadingInterventionPolicySnapshot = {
  layoutCommitBoundary: ReadingInterventionCommitBoundary
  layoutFallbackBoundary: ReadingInterventionCommitBoundary
  layoutFallbackAfterMs: number
}

export type ApplyInterventionCommandSnapshot = {
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

export type PendingInterventionSnapshot = {
  id: string
  status: "queued" | "applied" | "superseded"
  requestedBoundary: ReadingInterventionCommitBoundary
  fallbackBoundary: ReadingInterventionCommitBoundary | null
  fallbackAfterMs: number
  queuedAtUnixMs: number
  appliedAtUnixMs: number | null
  supersededAtUnixMs: number | null
  waitDurationMs: number | null
  isFallbackEligible: boolean
  resolutionReason: string | null
  intervention: ApplyInterventionCommandSnapshot
}

export type ReadingGazeObservationSnapshot = {
  observedAtUnixMs: number
  isInsideReadingArea: boolean
  normalizedContentX: number | null
  normalizedContentY: number | null
  tokenId: string | null
  tokenText: string | null
  tokenKind: string | null
  blockId: string | null
  tokenIndex: number | null
  lineIndex: number | null
  blockIndex: number | null
  isStale: boolean
  staleReason: string
}

export type FixationSnapshot = {
  tokenId: string
  blockId: string | null
  tokenIndex: number
  lineIndex: number
  blockIndex: number
  startedAtUnixMs: number
  lastObservedAtUnixMs: number
  durationMs: number
  endedAtUnixMs: number | null
}

export type SaccadeSnapshot = {
  fromTokenId: string
  toTokenId: string
  fromBlockId: string | null
  toBlockId: string | null
  fromTokenIndex: number
  toTokenIndex: number
  lineDelta: number
  blockDelta: number
  startedAtUnixMs: number
  endedAtUnixMs: number
  durationMs: number
  direction: string
}

export type EyeMovementAnalysisSnapshot = {
  latestObservation: ReadingGazeObservationSnapshot | null
  currentFixation: FixationSnapshot | null
  recentFixations: FixationSnapshot[]
  recentSaccades: SaccadeSnapshot[]
  tokenStats: Record<string, ReadingAttentionSummarySnapshot["tokenStats"][string]>
  currentTokenId: string | null
  currentTokenDurationMs: number | null
  fixatedTokenCount: number
  skimmedTokenCount: number
}

export type ReadingContextPreservationSnapshot = {
  status: "preserved" | "degraded" | "failed"
  anchorSource: "sentence-anchor" | "active-token" | "fallback-token" | "block-anchor" | "scroll-only"
  anchorSentenceId: string | null
  anchorTokenId: string | null
  anchorBlockId: string | null
  anchorErrorPx: number | null
  viewportDeltaPx: number | null
  commitBoundary: ReadingInterventionCommitBoundary
  waitDurationMs: number | null
  interventionAppliedAtUnixMs: number
  measuredAtUnixMs: number
  reason: string | null
}

export type LayoutInterventionGuardrailSnapshot = {
  status: "applied" | "suppressed"
  reason: "cooldown-active" | "change-too-large" | "no-op-layout-change" | null
  affectedProperties: Array<"font-family" | "font-size" | "line-width" | "line-height" | "letter-spacing">
  evaluatedAtUnixMs: number
  cooldownUntilUnixMs: number | null
}

export type InterventionEventSnapshot = {
  id: string
  source: string
  trigger: string
  reason: string
  appliedAtUnixMs: number
  appliedBoundary: ReadingInterventionCommitBoundary
  waitDurationMs: number | null
  appliedPresentation: ReadingPresentationSnapshot
  appliedAppearance: ReaderAppearanceSnapshot
  moduleId: string | null
  parameters: InterventionParameterValues | null
  committedActiveTokenId: string | null
  committedActiveSentenceId: string | null
  committedActiveBlockId: string | null
}

export type DecisionConfiguration = {
  conditionLabel: string
  providerId: string
  executionMode: string
}

export type EyeMovementAnalysisConfiguration = {
  providerId: string
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
  initialPresentation: ReadingPresentationSnapshot | null
  appearance: ReaderAppearanceSnapshot
  interventionPolicy: ReadingInterventionPolicySnapshot
  participantViewport: ParticipantViewportSnapshot
  focus: ReadingFocusSnapshot
  pendingIntervention: PendingInterventionSnapshot | null
  latestContextPreservation: ReadingContextPreservationSnapshot | null
  recentContextPreservationEvents: ReadingContextPreservationSnapshot[]
  latestLayoutGuardrail: LayoutInterventionGuardrailSnapshot | null
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
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  externalProviderStatus: ExternalProviderStatusSnapshot
  readingSession: LiveReadingSessionSnapshot | null
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
  eyeMovementAnalysisProviderStatus: EyeMovementAnalysisProviderStatusSnapshot
  eyeMovementAnalysisConfiguration: EyeMovementAnalysisConfiguration
  eyeMovementAnalysis: EyeMovementAnalysisSnapshot
}

export const EMPTY_LIVE_MONITORING: ExperimentLiveMonitoringSnapshot = {
  canStartSession: false,
  canFinishSession: false,
  isGazeStreamingActive: false,
  gazeSubscriberCount: 0,
  hasParticipantViewConnection: false,
  hasParticipantViewportData: false,
  participantViewportUpdatedAtUnixMs: null,
  hasReadingFocusSignal: false,
  focusUpdatedAtUnixMs: null,
}

export const EMPTY_EXTERNAL_PROVIDER_STATUS: ExternalProviderStatusSnapshot = {
  isConnected: false,
  status: "disconnected",
  providerId: null,
  displayName: null,
  supportsAdvisoryExecution: false,
  supportsAutonomousExecution: false,
  supportedInterventionModuleIds: [],
  lastHeartbeatAtUnixMs: null,
}

export const EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS: EyeMovementAnalysisProviderStatusSnapshot = {
  isConnected: false,
  status: "disconnected",
  providerId: null,
  displayName: null,
  lastHeartbeatAtUnixMs: null,
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
  initialPresentation: null,
  appearance: {
    themeMode: "light",
    palette: "default",
    appFont: "roboto-flex",
  },
  interventionPolicy: {
    layoutCommitBoundary: "page-turn",
    layoutFallbackBoundary: "page-turn",
    layoutFallbackAfterMs: 0,
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
    activePageIndex: 0,
    pageCount: 1,
    lastPageTurnAtUnixMs: null,
  },
  focus: {
    isInsideReadingArea: false,
    normalizedContentX: null,
    normalizedContentY: null,
    activeTokenId: null,
    activeBlockId: null,
    activeSentenceId: null,
    updatedAtUnixMs: 0,
  },
  pendingIntervention: null,
  latestContextPreservation: null,
  recentContextPreservationEvents: [],
  latestLayoutGuardrail: null,
  latestIntervention: null,
  recentInterventions: [],
  attentionSummary: null,
}

export const EMPTY_DECISION_CONFIGURATION: DecisionConfiguration = {
  conditionLabel: "Manual only",
  providerId: "manual",
  executionMode: "advisory",
}

export const EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION: EyeMovementAnalysisConfiguration = {
  providerId: "builtin",
}

export const EMPTY_EYE_MOVEMENT_ANALYSIS: EyeMovementAnalysisSnapshot = {
  latestObservation: null,
  currentFixation: null,
  recentFixations: [],
  recentSaccades: [],
  tokenStats: {},
  currentTokenId: null,
  currentTokenDurationMs: null,
  fixatedTokenCount: 0,
  skimmedTokenCount: 0,
}

export const EMPTY_DECISION_STATE: DecisionState = {
  automationPaused: false,
  activeProposal: null,
  recentProposalHistory: [],
}
