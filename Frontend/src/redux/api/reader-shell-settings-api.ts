import { baseApi } from "@/redux/api/base-api"
import type {
  ReaderShellSettingsSnapshot,
  ReaderShellViewSettings,
} from "@/lib/reader-shell-settings"

function serializeViewSettings(settings: ReaderShellViewSettings) {
  return {
    PreserveContextOnIntervention: settings.preserveContextOnIntervention,
    HighlightContext: settings.highlightContext,
    DisplayGazePosition: settings.displayGazePosition,
    HighlightTokensBeingLookedAt: settings.highlightTokensBeingLookedAt,
    ShowToolbar: settings.showToolbar,
    ShowBackButton: settings.showBackButton,
    ShowLixScores: settings.showLixScores,
  }
}

export const readerShellSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReaderShellSettings: builder.query<ReaderShellSettingsSnapshot, void>({
      query: () => "/reader-shell/settings",
      providesTags: ["ReaderShellSettings"],
    }),
    updateReaderShellSettings: builder.mutation<
      ReaderShellSettingsSnapshot,
      ReaderShellSettingsSnapshot
    >({
      query: (settings) => ({
        url: "/reader-shell/settings",
        method: "PUT",
        body: {
          Reading: serializeViewSettings(settings.reading),
          ResearcherMirror: serializeViewSettings(settings.researcherMirror),
          Replay: serializeViewSettings(settings.replay),
        },
      }),
      invalidatesTags: ["ReaderShellSettings"],
    }),
  }),
})

export const {
  useGetReaderShellSettingsQuery,
  useUpdateReaderShellSettingsMutation,
} = readerShellSettingsApi
