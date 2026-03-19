import { baseApi } from "@/redux/api/base-api"
import type { FontTheme } from "@/hooks/use-font-theme"

export type ReadingMaterialSetup = {
  id: string
  name: string
  title: string
  markdown: string
  researcherQuestions: string
  fontFamily: FontTheme
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByExperimenter: boolean
  createdAtUnixMs: number
  updatedAtUnixMs: number
}

export type CreateReadingMaterialSetupRequest = {
  name: string
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

export type UpdateReadingMaterialSetupRequest = CreateReadingMaterialSetupRequest

export const readingMaterialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReadingMaterialSetups: builder.query<ReadingMaterialSetup[], void>({
      query: () => ({
        url: "/reading-material-setups",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((item) => ({ type: "ReadingMaterialSetup" as const, id: item.id })),
              { type: "ReadingMaterialSetup" as const, id: "LIST" },
            ]
          : [{ type: "ReadingMaterialSetup" as const, id: "LIST" }],
    }),
    getReadingMaterialSetupById: builder.query<ReadingMaterialSetup, string>({
      query: (id) => ({
        url: `/reading-material-setups/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "ReadingMaterialSetup", id }],
    }),
    createReadingMaterialSetup: builder.mutation<
      ReadingMaterialSetup,
      CreateReadingMaterialSetupRequest
    >({
      query: (body) => ({
        url: "/reading-material-setups",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ReadingMaterialSetup", id: "LIST" }],
    }),
    updateReadingMaterialSetup: builder.mutation<
      ReadingMaterialSetup,
      { id: string; body: UpdateReadingMaterialSetupRequest }
    >({
      query: ({ id, body }) => ({
        url: `/reading-material-setups/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ReadingMaterialSetup", id: arg.id },
        { type: "ReadingMaterialSetup", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useCreateReadingMaterialSetupMutation,
  useGetReadingMaterialSetupsQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useUpdateReadingMaterialSetupMutation,
} = readingMaterialApi
