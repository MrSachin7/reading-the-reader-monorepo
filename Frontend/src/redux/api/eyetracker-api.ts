import { baseApi } from "@/redux/api/base-api"

export type Eyetracker = {
  name: string
  model: string
  serialNumber: string
  hasSavedLicence: boolean
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
}

export const eyetrackerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEyetrackers: builder.query<Eyetracker[], void>({
      query: () => "/eyetrackers",
      transformResponse: (response: EyeTrackerApiResponse[]) =>
        response.map((item) => ({
          name: item.name ?? "",
          model: item.model ?? "",
          serialNumber: item.serialNumber ?? "",
          hasSavedLicence: Boolean(item.hasSavedLicence),
        })),
      providesTags: ["Eyetracker"],
    }),
    selectEyetracker: builder.mutation<void, SelectEyetrackerPayload>({
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
    }),
  }),
})

export const { useGetEyetrackersQuery, useSelectEyetrackerMutation } = eyetrackerApi
