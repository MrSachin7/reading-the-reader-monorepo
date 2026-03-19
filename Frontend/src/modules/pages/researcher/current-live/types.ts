import type { ExperimentSessionSnapshot, LiveReadingSessionSnapshot } from "@/lib/experiment-session"
import type { ReaderShellViewSettings } from "@/lib/reader-shell-settings"

export type LiveReaderOptions = ReaderShellViewSettings

export type ActiveLiveExperimentSession = ExperimentSessionSnapshot & {
  readingSession: LiveReadingSessionSnapshot
}
