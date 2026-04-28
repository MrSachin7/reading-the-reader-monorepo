import type { FontTheme } from "@/hooks/use-font-theme"
import { baseApi } from "@/redux/api/base-api"

export type ExperimentSetupItem = {
  id: string
  order: number
  sourceReadingMaterialSetupId: string | null
  sourceReadingMaterialTitle: string
  title: string
  markdown: string
  researcherQuestions: string
  fontFamily: FontTheme
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByExperimenter: boolean
}

export type ExperimentSetup = {
  id: string
  name: string
  description: string
  items: ExperimentSetupItem[]
  createdAtUnixMs: number
  updatedAtUnixMs: number
}

export type CreateExperimentSetupRequestItem = Omit<ExperimentSetupItem, "id" | "order">

export type CreateExperimentSetupRequest = {
  name: string
  description: string
  items: CreateExperimentSetupRequestItem[]
}

export type UpdateExperimentSetupRequestItem = {
  id?: string
  sourceReadingMaterialSetupId: string | null
  sourceReadingMaterialTitle: string
  title: string
  markdown: string
  researcherQuestions: string
  fontFamily: FontTheme
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByExperimenter: boolean
}

export type UpdateExperimentSetupRequest = {
  name: string
  description: string
  items: UpdateExperimentSetupRequestItem[]
}

export const experimentSetupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExperimentSetups: builder.query<ExperimentSetup[], void>({
      query: () => ({
        url: "/experiment-setups",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((item) => ({ type: "ExperimentSetup" as const, id: item.id })),
              { type: "ExperimentSetup" as const, id: "LIST" },
            ]
          : [{ type: "ExperimentSetup" as const, id: "LIST" }],
    }),
    getExperimentSetupById: builder.query<ExperimentSetup, string>({
      query: (id) => ({
        url: `/experiment-setups/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "ExperimentSetup", id }],
    }),
    createExperimentSetup: builder.mutation<ExperimentSetup, CreateExperimentSetupRequest>({
      query: (body) => ({
        url: "/experiment-setups",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ExperimentSetup", id: "LIST" }],
    }),
    updateExperimentSetup: builder.mutation<
      ExperimentSetup,
      { id: string; body: UpdateExperimentSetupRequest }
    >({
      query: ({ id, body }) => ({
        url: `/experiment-setups/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ExperimentSetup", id: arg.id },
        { type: "ExperimentSetup", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useCreateExperimentSetupMutation,
  useGetExperimentSetupsQuery,
  useLazyGetExperimentSetupByIdQuery,
  useUpdateExperimentSetupMutation,
} = experimentSetupApi
