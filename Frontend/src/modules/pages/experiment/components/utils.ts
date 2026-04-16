import type { CalibrationQuality } from "@/lib/calibration"
import type { ExperimentSetupSnapshot, SensingMode } from "@/lib/experiment-session"

export type CalibrationStepProps = {
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}

export const EMPTY_EXPERIMENT_SETUP: ExperimentSetupSnapshot = {
  isReadyForSessionStart: false,
  currentStepIndex: 0,
  currentBlocker: null,
  eyeTracker: {
    isReady: false,
    hasSelectedEyeTracker: false,
    hasAppliedLicence: false,
    hasSavedLicence: false,
    savedLicenceMissing: false,
    selectedTrackerSerialNumber: null,
    selectedTrackerName: null,
    blockReason: null,
  },
  participant: {
    isReady: false,
    hasParticipant: false,
    participantName: null,
    blockReason: null,
  },
  calibration: {
    isReady: false,
    hasCalibrationSession: false,
    isCalibrationApplied: false,
    isValidationPassed: false,
    status: "idle",
    validationStatus: "idle",
    validationQuality: null,
    averageAccuracyDegrees: null,
    averagePrecisionDegrees: null,
    sampleCount: 0,
    blockReason: null,
  },
  readingMaterial: {
    isReady: false,
    hasReadingMaterial: false,
    documentId: null,
    title: null,
    sourceSetupId: null,
    usesSavedSetup: false,
    configuredAtUnixMs: null,
    allowsResearcherPresentationChanges: false,
    isPresentationLocked: false,
    blockReason: null,
  },
}

export type AuthoritativeWorkflowStepState = {
  index: number
  isReady: boolean
  isAvailable: boolean
  blockReason: string | null
  summary: string
}

export function formatCalibrationQualityLabel(
  quality: CalibrationQuality | "unknown" | null | undefined
) {
  if (!quality) {
    return "No rating yet"
  }

  if (quality === "unknown") {
    return "Unknown"
  }

  return `${quality.charAt(0).toUpperCase()}${quality.slice(1)} quality`
}

export function formatCalibrationMetric(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Not available"
  }

  return `${value.toFixed(2)}°`
}

export function getAuthoritativeWorkflowStepStates(
  setup: ExperimentSetupSnapshot,
  sensingMode: SensingMode = "eyeTracker"
): AuthoritativeWorkflowStepState[] {
  const currentStepIndex = Math.min(Math.max(setup.currentStepIndex, 0), 3)
  const isMouseMode = sensingMode === "mouse"

  return [
    {
      index: 0,
      isReady: setup.eyeTracker.isReady,
      isAvailable: currentStepIndex >= 0,
      blockReason: setup.eyeTracker.blockReason,
      summary: isMouseMode
        ? "Mouse mode active. Eyetracker selection and licence upload are skipped."
        : setup.eyeTracker.isReady
        ? `Using ${setup.eyeTracker.selectedTrackerName ?? "selected eyetracker"} with licence ready.`
        : setup.eyeTracker.blockReason ?? "Choose a connected eyetracker and provide a licence if required.",
    },
    {
      index: 1,
      isReady: setup.participant.isReady,
      isAvailable: currentStepIndex >= 1 || setup.participant.isReady,
      blockReason: setup.participant.blockReason,
      summary: setup.participant.isReady
        ? `Participant ${setup.participant.participantName ?? "details"} saved to the session.`
        : setup.participant.blockReason ?? "Save participant details before continuing.",
    },
    {
      index: 2,
      isReady: setup.calibration.isReady,
      isAvailable: currentStepIndex >= 2 || setup.calibration.isReady,
      blockReason: setup.calibration.blockReason,
      summary: isMouseMode
        ? "Mouse mode active. Calibration and validation are skipped."
        : setup.calibration.isReady
        ? `Validation passed with ${formatCalibrationQualityLabel(setup.calibration.validationQuality)}.`
        : setup.calibration.blockReason ?? "Run calibration and validation before starting the session.",
    },
    {
      index: 3,
      isReady: setup.readingMaterial.isReady,
      isAvailable: currentStepIndex >= 3 || setup.readingMaterial.isReady,
      blockReason: setup.readingMaterial.blockReason,
      summary: setup.readingMaterial.isReady
        ? `${setup.readingMaterial.title ?? "Reading material"} is saved for session start.`
        : setup.readingMaterial.blockReason ?? "Choose and save reading material before starting.",
    },
  ]
}
