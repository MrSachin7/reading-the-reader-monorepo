import type {
  DecisionConfiguration,
  DecisionProposalSnapshot,
  DecisionState,
  ExperimentSessionSnapshot,
  LiveReadingSessionSnapshot,
} from "@/lib/experiment-session"
import type { ReaderShellViewSettings } from "@/lib/reader-shell-settings"

export type LiveReaderOptions = ReaderShellViewSettings
export type ActiveProposal = DecisionProposalSnapshot
export type LiveDecisionConfiguration = DecisionConfiguration
export type LiveDecisionState = DecisionState

export type ActiveLiveExperimentSession = ExperimentSessionSnapshot & {
  readingSession: LiveReadingSessionSnapshot
}
