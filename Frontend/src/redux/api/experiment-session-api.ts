import type { ExperimentSessionSnapshot } from "@/lib/experiment-session"
import { baseApi } from "@/redux/api/base-api"

export type ReplayExportFormat = "json" | "csv"

export type UpsertReadingSessionPayload = {
  documentId: string
  title: string
  markdown: string
  sourceSetupId?: string | null
  fontFamily: string
  fontSizePx: number
  lineWidthPx: number
  lineHeight: number
  letterSpacingEm: number
  editableByResearcher: boolean
  themeMode: string
  palette: string
  appFont: string
}

export type SavedExperimentReplayExportSummary = {
  id: string
  name: string
  fileName: string
  format: ReplayExportFormat
  sessionId: string | null
  createdAtUnixMs: number
  updatedAtUnixMs: number
  exportedAtUnixMs: number
}

export type UpdateDecisionConfigurationPayload = {
  conditionLabel: string
  providerId: string
  executionMode: string
  automationPaused: boolean
}

export type UpdateExperimentSetupTestingOverridesPayload = {
  forceEyeTrackerReady: boolean | null
  forceParticipantReady: boolean | null
  forceCalibrationReady: boolean | null
  forceReadingMaterialReady: boolean | null
}

export const experimentSessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExperimentSession: builder.query<ExperimentSessionSnapshot, void>({
      query: () => "/experiment-session",
      providesTags: ["Experiment"],
    }),
    upsertReadingSession: builder.mutation<
      ExperimentSessionSnapshot,
      UpsertReadingSessionPayload
    >({
      query: (body) => ({
        url: "/experiment-session/reading-session",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Experiment"],
    }),
    updateDecisionConfiguration: builder.mutation<
      ExperimentSessionSnapshot,
      UpdateDecisionConfigurationPayload
    >({
      query: (body) => ({
        url: "/experiment-session/decision-configuration",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Experiment"],
    }),
    updateExperimentSetupTestingOverrides: builder.mutation<
      ExperimentSessionSnapshot,
      UpdateExperimentSetupTestingOverridesPayload
    >({
      query: (body) => ({
        url: "/experiment-session/testing-overrides",
        method: "PUT",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            experimentSessionApi.util.upsertQueryData(
              "getExperimentSession",
              undefined,
              data
            )
          )
        } catch {
          // Let the request surface through normal RTK Query error handling.
        }
      },
    }),
    startExperimentSession: builder.mutation<void, void>({
      query: () => ({
        url: "/eyetrackers/start",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    stopExperimentSession: builder.mutation<void, void>({
      query: () => ({
        url: "/eyetrackers/stop",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    finishExperimentSession: builder.mutation<
      ExperimentSessionSnapshot,
      { source: string }
    >({
      query: (body) => ({
        url: "/experiment-session/finish",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Experiment"],
    }),
    resetExperimentSession: builder.mutation<ExperimentSessionSnapshot, void>({
      query: () => ({
        url: "/experiment-session/reset",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    saveExperimentReplayExport: builder.mutation<
      SavedExperimentReplayExportSummary,
      { name: string; format: ReplayExportFormat }
    >({
      query: (body) => ({
        url: "/experiment-replay-exports",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ReplayExport", id: "LIST" }],
    }),
    getSavedExperimentReplayExports: builder.query<SavedExperimentReplayExportSummary[], void>({
      query: () => ({
        url: "/experiment-replay-exports",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((item) => ({ type: "ReplayExport" as const, id: item.id })),
              { type: "ReplayExport" as const, id: "LIST" },
            ]
          : [{ type: "ReplayExport" as const, id: "LIST" }],
    }),
    getSavedExperimentReplayExportById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/experiment-replay-exports/${encodeURIComponent(id)}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "ReplayExport", id }],
    }),
  }),
})

export const {
  useGetExperimentSessionQuery,
  useGetSavedExperimentReplayExportByIdQuery,
  useFinishExperimentSessionMutation,
  useGetSavedExperimentReplayExportsQuery,
  useLazyGetSavedExperimentReplayExportByIdQuery,
  useResetExperimentSessionMutation,
  useSaveExperimentReplayExportMutation,
  useStartExperimentSessionMutation,
  useStopExperimentSessionMutation,
  useUpdateDecisionConfigurationMutation,
  useUpdateExperimentSetupTestingOverridesMutation,
  useUpsertReadingSessionMutation,
} = experimentSessionApi
