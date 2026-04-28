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
  source: "preset" | "custom" | "experiment"
  title: string
  customMarkdown: string
  researcherQuestions: string
  selectedExperimentSetupId: string | null
  selectedExperimentSetupName: string | null
  selectedExperimentSetupItemId: string | null
  selectedReadingMaterialSetupId: string | null
  selectedExperimentItemCount: number
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
    selectedExperimentSetupId: null,
    selectedExperimentSetupName: null,
    selectedExperimentSetupItemId: null,
    selectedReadingMaterialSetupId: null,
    selectedExperimentItemCount: 0,
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
      const validationPassed = calibration.validation.result?.passed === true
      const authoritativeCalibrationReady =
        session.setup.calibration.isReady || validationPassed

      state.stepOne = {
        ...state.stepOne,
        serialNumber: eyeTracker?.serialNumber ?? "",
        overwriteExistingLicence: false,
        saveLicence: false,
        licenceFileName: null,
        selectionConfirmed: session.setup.eyeTracker.isReady,
        lastSyncedFingerprint: eyeTrackerFingerprint,
      }

      state.stepTwo = {
        ...state.stepTwo,
        name: participant?.name ?? "",
        age: participant?.age ?? 18,
        sex: participant?.sex ?? "",
        eyeCondition: participant?.existingEyeCondition ?? "",
        readingProficiency: participant?.readingProficiency ?? "",
        participantConfirmed: session.setup.participant.isReady,
        lastSyncedFingerprint: participantFingerprint,
      }

      state.stepThree = {
        ...state.stepThree,
        externalCalibrationCompleted: authoritativeCalibrationReady,
        useLocalCalibration: false,
        calibrationSkipped: false,
        internalCalibrationStatus:
          authoritativeCalibrationReady
            ? "completed"
            : calibration.validation.result && calibration.validation.result.passed === false
              ? "failed"
            : calibration.status === "running" || calibration.validation.status === "running"
              ? "running"
              : calibration.status === "failed" ||
                  calibration.status === "cancelled" ||
                  calibration.validation.status === "failed"
                ? "failed"
                : "pending",
        lastAppliedAtUnixMs:
          calibration.validation.completedAtUnixMs ??
          calibration.completedAtUnixMs ??
          state.stepThree.lastAppliedAtUnixMs,
        lastQuality:
          session.setup.calibration.validationQuality ??
          calibration.validation.result?.quality ??
          null,
        lastCalibrationSessionId:
          calibration.sessionId ?? state.stepThree.lastCalibrationSessionId,
        lastCalibrationStatus:
          calibration.validation.result
            ? calibration.validation.result.passed
              ? "Validation passed"
              : "Validation failed"
            : calibration.result?.status ??
          (calibration.status === "idle"
            ? state.stepThree.lastCalibrationStatus
            : calibration.status),
      }

      state.readingSession = {
        ...state.readingSession,
        title: session.readingSession?.content?.title ?? state.readingSession.title,
        customMarkdown: session.readingSession?.content?.markdown ?? state.readingSession.customMarkdown,
        source:
          session.readingSession?.content?.experimentSetupId
            ? "experiment"
            : session.readingSession?.content?.sourceSetupId
              ? "custom"
              : state.readingSession.source,
        selectedExperimentSetupId:
          session.readingSession?.content?.experimentSetupId ?? state.readingSession.selectedExperimentSetupId,
        selectedExperimentSetupName: state.readingSession.selectedExperimentSetupName,
        selectedExperimentSetupItemId:
          session.readingSession?.content?.experimentSetupItemId ??
          state.readingSession.selectedExperimentSetupItemId,
        selectedReadingMaterialSetupId:
          session.readingSession?.content?.sourceSetupId ??
          state.readingSession.selectedReadingMaterialSetupId,
        selectedExperimentItemCount: state.readingSession.selectedExperimentItemCount,
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
    setReadingSessionExperimentSelection: (
      state,
      action: PayloadAction<{
        experimentSetupId: string | null
        experimentSetupName: string | null
        experimentSetupItemId: string | null
        readingMaterialSetupId: string | null
        itemCount: number
      }>
    ) => {
      state.readingSession.selectedExperimentSetupId = action.payload.experimentSetupId
      state.readingSession.selectedExperimentSetupName = action.payload.experimentSetupName
      state.readingSession.selectedExperimentSetupItemId = action.payload.experimentSetupItemId
      state.readingSession.selectedReadingMaterialSetupId = action.payload.readingMaterialSetupId
      state.readingSession.selectedExperimentItemCount = action.payload.itemCount
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
  setReadingSessionExperimentSelection,
  resetReadingSessionState,
} = experimentSlice.actions

export default experimentSlice.reducer
