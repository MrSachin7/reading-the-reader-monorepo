import { baseApi } from "@/redux/api/base-api"
import type { SensingMode } from "@/lib/experiment-session"

export type SensingModeSettings = {
  mode: SensingMode
  canChangeMode: boolean
  blockReason: string | null
}

export const sensingModeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSensingModeSettings: builder.query<SensingModeSettings, void>({
      query: () => "/sensing-mode/settings",
      providesTags: ["SensingModeSettings"],
    }),
    updateSensingModeSettings: builder.mutation<SensingModeSettings, { mode: SensingMode }>({
      query: ({ mode }) => ({
        url: "/sensing-mode/settings",
        method: "PUT",
        body: { Mode: mode },
      }),
      invalidatesTags: ["SensingModeSettings", "Experiment"],
    }),
  }),
})

export const {
  useGetSensingModeSettingsQuery,
  useUpdateSensingModeSettingsMutation,
} = sensingModeApi
