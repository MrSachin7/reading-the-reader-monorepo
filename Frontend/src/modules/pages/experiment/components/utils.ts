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
  const isMouseMode = sensingMode === "mouse"
  const researcherPreparationReady = setup.eyeTracker.isReady && setup.readingMaterial.isReady
  const calibrationRunning =
    setup.calibration.status === "running" || setup.calibration.validationStatus === "running"
  const calibrationFailed =
    !setup.calibration.isReady &&
    (setup.calibration.status === "failed" ||
      setup.calibration.validationStatus === "failed" ||
      (setup.calibration.hasCalibrationSession && setup.calibration.isValidationPassed === false))

  return [
    {
      index: 0,
      isReady: setup.eyeTracker.isReady,
      isAvailable: true,
      blockReason: setup.eyeTracker.blockReason,
      summary: isMouseMode
        ? "Mouse mode active. Eyetracker selection and licence upload are skipped."
        : setup.eyeTracker.isReady
        ? `Using ${setup.eyeTracker.selectedTrackerName ?? "selected eyetracker"} with licence ready.`
        : setup.eyeTracker.blockReason ?? "Choose a connected eyetracker and provide a licence if required.",
    },
    {
      index: 1,
      isReady: setup.readingMaterial.isReady,
      isAvailable: setup.eyeTracker.isReady,
      blockReason: setup.eyeTracker.isReady
        ? setup.readingMaterial.blockReason
        : "Finish the eyetracker and licence step before preparing the reading baseline.",
      summary: setup.readingMaterial.isReady
        ? `${setup.readingMaterial.title ?? "Reading material"} is saved for session start.`
        : setup.eyeTracker.isReady
          ? setup.readingMaterial.blockReason ?? "Choose and save reading material before handing over to the participant."
          : "Complete the eyetracker setup before preparing the reading baseline.",
    },
    {
      index: 2,
      isReady: setup.participant.isReady,
      isAvailable: researcherPreparationReady,
      blockReason: researcherPreparationReady
        ? setup.participant.blockReason
        : "The participant stepper unlocks after the researcher prepares the device and reading baseline.",
      summary: setup.participant.isReady
        ? `Participant ${setup.participant.participantName ?? "details"} saved to the session.`
        : researcherPreparationReady
          ? setup.participant.blockReason ?? "Save participant details before continuing."
          : "Waiting for the researcher to finish preparation first.",
    },
    {
      index: 3,
      isReady: setup.calibration.isReady,
      isAvailable: researcherPreparationReady && setup.participant.isReady,
      blockReason:
        researcherPreparationReady && setup.participant.isReady
          ? setup.calibration.blockReason
          : "Save participant details after researcher preparation before starting calibration.",
      summary: isMouseMode
        ? "Mouse mode active. Calibration and validation are skipped."
        : setup.calibration.isReady
          ? `Validation passed with ${formatCalibrationQualityLabel(setup.calibration.validationQuality)}.`
          : calibrationRunning
            ? "Calibration is currently running."
            : calibrationFailed
              ? "Calibration needs to be rerun before the session can start."
              : researcherPreparationReady && setup.participant.isReady
                ? setup.calibration.blockReason ?? "Run calibration and validation before starting the session."
                : "Waiting for participant information before calibration can begin.",
    },
  ]
}
