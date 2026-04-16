import { baseApi } from "@/redux/api/base-api"
import type { ExperimentSetupSnapshot } from "@/lib/experiment-session"

export type Eyetracker = {
  name: string
  model: string
  serialNumber: string
  hasSavedLicence: boolean
  requiresLicence: boolean
  isSelected: boolean
}

export type SelectEyetrackerPayload = {
  serialNumber: string
  saveLicence: boolean
  licenceFile?: File | null
}

type EyeTrackerApiResponse = {
  name?: string
  model?: string
  serialNumber?: string
  hasSavedLicence?: boolean
  requiresLicence?: boolean
  isSelected?: boolean
}

export type SelectEyetrackerResult = {
  selectedTracker: Eyetracker
  setup: ExperimentSetupSnapshot
}

type SelectEyetrackerApiResponse = {
  selectedTracker?: EyeTrackerApiResponse
  setup?: ExperimentSetupSnapshot
}

function isProEyeTrackerModel(model: string | undefined) {
  return model?.toLowerCase().includes("pro fusion") ?? false
}

function mapEyetracker(item: EyeTrackerApiResponse): Eyetracker {
  const model = item.model ?? ""

  return {
    name: item.name ?? "",
    model,
    serialNumber: item.serialNumber ?? "",
    hasSavedLicence: Boolean(item.hasSavedLicence),
    requiresLicence: item.requiresLicence ?? !isProEyeTrackerModel(model),
    isSelected: Boolean(item.isSelected),
  }
}

export const eyetrackerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEyetrackers: builder.query<Eyetracker[], void>({
      query: () => "/eyetrackers",
      transformResponse: (response: EyeTrackerApiResponse[]) =>
        response.map(mapEyetracker),
      providesTags: ["Eyetracker"],
    }),
    selectEyetracker: builder.mutation<SelectEyetrackerResult, SelectEyetrackerPayload>({
      query: ({ serialNumber, saveLicence, licenceFile }) => {
        const formData = new FormData()
        formData.append("SerialNumber", serialNumber)
        formData.append("SaveLicence", String(saveLicence))
        if (licenceFile) {
          formData.append("LicenceFile", licenceFile)
        }

        return {
          url: "/eyetrackers/select",
          method: "POST",
          body: formData,
        }
      },
      transformResponse: (response: SelectEyetrackerApiResponse) => ({
        selectedTracker: mapEyetracker(response.selectedTracker ?? {}),
        setup: response.setup ?? {
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
        },
      }),
      invalidatesTags: ["Eyetracker", "Experiment"],
    }),
  }),
})

export const { useGetEyetrackersQuery, useSelectEyetrackerMutation } = eyetrackerApi
