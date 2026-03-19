import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { ExperimentSessionSnapshot } from "@/lib/experiment-session"

type ExperimentStepOneState = {
  serialNumber: string
  overwriteExistingLicence: boolean
  saveLicence: boolean
  licenceFileName: string | null
  selectionConfirmed: boolean
  lastSyncedFingerprint: string | null
}

type ExperimentStepTwoState = {
  name: string
  age: number
  sex: string
  eyeCondition: string
  readingProficiency: string
  participantConfirmed: boolean
  lastSyncedFingerprint: string | null
}

type ExperimentStepThreeState = {
  externalCalibrationCompleted: boolean
  useLocalCalibration: boolean
  calibrationSkipped: boolean
  internalCalibrationStatus: "pending" | "running" | "failed" | "completed"
  lastAppliedAtUnixMs: number | null
  lastQuality: "good" | "fair" | "poor" | "unknown" | null
  lastCalibrationSessionId: string | null
  lastCalibrationStatus: string | null
}

type ReadingSessionState = {
  source: "preset" | "custom"
  title: string
  customMarkdown: string
  researcherQuestions: string
}

type ExperimentState = {
  stepOne: ExperimentStepOneState
  stepTwo: ExperimentStepTwoState
  stepThree: ExperimentStepThreeState
  readingSession: ReadingSessionState
}

export type PersistedStepThreeCalibrationState = Pick<
  ExperimentStepThreeState,
  | "useLocalCalibration"
  | "calibrationSkipped"
  | "internalCalibrationStatus"
  | "lastAppliedAtUnixMs"
  | "lastQuality"
  | "lastCalibrationSessionId"
  | "lastCalibrationStatus"
>

const initialState: ExperimentState = {
  stepOne: {
    serialNumber: "",
    overwriteExistingLicence: false,
    saveLicence: false,
    licenceFileName: null,
    selectionConfirmed: false,
    lastSyncedFingerprint: null,
  },
  stepTwo: {
    name: "",
    age: 18,
    sex: "",
    eyeCondition: "",
    readingProficiency: "",
    participantConfirmed: false,
    lastSyncedFingerprint: null,
  },
  stepThree: {
    externalCalibrationCompleted: false,
    useLocalCalibration: false,
    calibrationSkipped: false,
    internalCalibrationStatus: "pending",
    lastAppliedAtUnixMs: null,
    lastQuality: null,
    lastCalibrationSessionId: null,
    lastCalibrationStatus: null,
  },
  readingSession: {
    source: "preset",
    title: "Reading as Deliberate Attention",
    customMarkdown: "",
    researcherQuestions: "",
  },
}

const experimentSlice = createSlice({
  name: "experiment",
  initialState,
  reducers: {
    setStepOneSerialNumber: (state, action: PayloadAction<string>) => {
      state.stepOne.serialNumber = action.payload
    },
    setStepOneOverwriteExistingLicence: (state, action: PayloadAction<boolean>) => {
      state.stepOne.overwriteExistingLicence = action.payload
    },
    setStepOneSaveLicence: (state, action: PayloadAction<boolean>) => {
      state.stepOne.saveLicence = action.payload
    },
    setStepOneLicenceFileName: (state, action: PayloadAction<string | null>) => {
      state.stepOne.licenceFileName = action.payload
    },
    setStepOneSelectionConfirmed: (state, action: PayloadAction<boolean>) => {
      state.stepOne.selectionConfirmed = action.payload
    },
    setStepOneLastSyncedFingerprint: (state, action: PayloadAction<string | null>) => {
      state.stepOne.lastSyncedFingerprint = action.payload
    },
    resetStepOneState: (state) => {
      state.stepOne = initialState.stepOne
    },
    setStepTwoName: (state, action: PayloadAction<string>) => {
      state.stepTwo.name = action.payload
    },
    setStepTwoAge: (state, action: PayloadAction<number>) => {
      state.stepTwo.age = action.payload
    },
    setStepTwoSex: (state, action: PayloadAction<string>) => {
      state.stepTwo.sex = action.payload
    },
    setStepTwoEyeCondition: (state, action: PayloadAction<string>) => {
      state.stepTwo.eyeCondition = action.payload
    },
    setStepTwoReadingProficiency: (state, action: PayloadAction<string>) => {
      state.stepTwo.readingProficiency = action.payload
    },
    setStepTwoParticipantConfirmed: (state, action: PayloadAction<boolean>) => {
      state.stepTwo.participantConfirmed = action.payload
    },
    setStepTwoLastSyncedFingerprint: (state, action: PayloadAction<string | null>) => {
      state.stepTwo.lastSyncedFingerprint = action.payload
    },
    resetStepTwoState: (state) => {
      state.stepTwo = initialState.stepTwo
    },
    setStepThreeExternalCalibrationCompleted: (state, action: PayloadAction<boolean>) => {
      state.stepThree.externalCalibrationCompleted = action.payload
    },
    setStepThreeUseLocalCalibration: (state, action: PayloadAction<boolean>) => {
      state.stepThree.useLocalCalibration = action.payload
    },
    setStepThreeCalibrationSkipped: (state, action: PayloadAction<boolean>) => {
      state.stepThree.calibrationSkipped = action.payload
    },
    setStepThreeInternalCalibrationStatus: (
      state,
      action: PayloadAction<ExperimentStepThreeState["internalCalibrationStatus"]>
    ) => {
      state.stepThree.internalCalibrationStatus = action.payload
    },
    setStepThreeLastAppliedAtUnixMs: (state, action: PayloadAction<number | null>) => {
      state.stepThree.lastAppliedAtUnixMs = action.payload
    },
    setStepThreeLastQuality: (
      state,
      action: PayloadAction<ExperimentStepThreeState["lastQuality"]>
    ) => {
      state.stepThree.lastQuality = action.payload
    },
    setStepThreeLastCalibrationSessionId: (state, action: PayloadAction<string | null>) => {
      state.stepThree.lastCalibrationSessionId = action.payload
    },
    setStepThreeLastCalibrationStatus: (state, action: PayloadAction<string | null>) => {
      state.stepThree.lastCalibrationStatus = action.payload
    },
    hydrateStepThreeCalibrationState: (
      state,
      action: PayloadAction<PersistedStepThreeCalibrationState>
    ) => {
      state.stepThree = {
        ...state.stepThree,
        ...action.payload,
      }
    },
    hydrateExperimentFromSession: (
      state,
      action: PayloadAction<ExperimentSessionSnapshot>
    ) => {
      const session = action.payload
      const participant = session.participant
      const eyeTracker = session.eyeTrackerDevice
      const calibration = session.calibration
      const eyeTrackerFingerprint = eyeTracker
        ? JSON.stringify({
            serialNumber: eyeTracker.serialNumber,
            overwriteExistingLicence: false,
            saveLicence: false,
            licenceFileName: null,
          })
        : null
      const participantFingerprint = participant
        ? JSON.stringify({
            name: participant.name,
            age: participant.age,
            sex: participant.sex,
            eyeCondition: participant.existingEyeCondition,
            readingProficiency: participant.readingProficiency,
          })
        : null
      const calibrationApplied =
        session.setup.calibrationCompleted || calibration.result?.applied === true
      const effectiveCalibrationApplied =
        calibrationApplied || state.stepThree.externalCalibrationCompleted

      state.stepOne = {
        ...state.stepOne,
        serialNumber: eyeTracker?.serialNumber ?? "",
        overwriteExistingLicence: false,
        saveLicence: false,
        licenceFileName: null,
        selectionConfirmed: session.setup.eyeTrackerSetupCompleted,
        lastSyncedFingerprint: eyeTrackerFingerprint,
      }

      state.stepTwo = {
        ...state.stepTwo,
        name: participant?.name ?? "",
        age: participant?.age ?? 18,
        sex: participant?.sex ?? "",
        eyeCondition: participant?.existingEyeCondition ?? "",
        readingProficiency: participant?.readingProficiency ?? "",
        participantConfirmed: session.setup.participantSetupCompleted,
        lastSyncedFingerprint: participantFingerprint,
      }

      state.stepThree = {
        ...state.stepThree,
        externalCalibrationCompleted: effectiveCalibrationApplied,
        useLocalCalibration: false,
        calibrationSkipped: calibrationApplied ? false : state.stepThree.calibrationSkipped,
        internalCalibrationStatus:
          effectiveCalibrationApplied
            ? "completed"
            : calibration.status === "running"
              ? "running"
              : calibration.status === "failed" || calibration.status === "cancelled"
                ? "failed"
                : "pending",
        lastAppliedAtUnixMs:
          calibrationApplied
            ? calibration.completedAtUnixMs
            : state.stepThree.lastAppliedAtUnixMs,
        lastQuality:
          effectiveCalibrationApplied
            ? state.stepThree.lastQuality ?? "unknown"
            : null,
        lastCalibrationSessionId:
          calibration.sessionId ?? state.stepThree.lastCalibrationSessionId,
        lastCalibrationStatus:
          calibration.result?.status ??
          (calibration.status === "idle"
            ? state.stepThree.lastCalibrationStatus
            : calibration.status),
      }
    },
    resetStepThreeState: (state) => {
      state.stepThree = initialState.stepThree
    },
    setReadingSessionSource: (
      state,
      action: PayloadAction<ReadingSessionState["source"]>
    ) => {
      state.readingSession.source = action.payload
    },
    setReadingSessionTitle: (state, action: PayloadAction<string>) => {
      state.readingSession.title = action.payload
    },
    setReadingSessionCustomMarkdown: (state, action: PayloadAction<string>) => {
      state.readingSession.customMarkdown = action.payload
    },
    setReadingSessionResearcherQuestions: (state, action: PayloadAction<string>) => {
      state.readingSession.researcherQuestions = action.payload
    },
    resetReadingSessionState: (state) => {
      state.readingSession = initialState.readingSession
    },
  },
})

export const {
  setStepOneSerialNumber,
  setStepOneOverwriteExistingLicence,
  setStepOneSaveLicence,
  setStepOneLicenceFileName,
  setStepOneSelectionConfirmed,
  setStepOneLastSyncedFingerprint,
  resetStepOneState,
  setStepTwoName,
  setStepTwoAge,
  setStepTwoSex,
  setStepTwoEyeCondition,
  setStepTwoReadingProficiency,
  setStepTwoParticipantConfirmed,
  setStepTwoLastSyncedFingerprint,
  resetStepTwoState,
  setStepThreeExternalCalibrationCompleted,
  setStepThreeUseLocalCalibration,
  setStepThreeCalibrationSkipped,
  setStepThreeInternalCalibrationStatus,
  setStepThreeLastAppliedAtUnixMs,
  setStepThreeLastQuality,
  setStepThreeLastCalibrationSessionId,
  setStepThreeLastCalibrationStatus,
  hydrateExperimentFromSession,
  hydrateStepThreeCalibrationState,
  resetStepThreeState,
  setReadingSessionSource,
  setReadingSessionTitle,
  setReadingSessionCustomMarkdown,
  setReadingSessionResearcherQuestions,
  resetReadingSessionState,
} = experimentSlice.actions

export default experimentSlice.reducer
