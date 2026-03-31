import type {
  DecisionConfiguration,
  DecisionProposalSnapshot,
  DecisionState,
  ExperimentSessionSnapshot,
  LiveReadingSessionSnapshot,
} from "@/lib/experiment-session"
import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"
import type { ReaderShellViewSettings } from "@/lib/reader-shell-settings"
import type { LiveInterventionModuleGroup } from "@/modules/pages/researcher/current-live/lib/group-intervention-modules"

export type LiveReaderOptions = ReaderShellViewSettings
export type ActiveProposal = DecisionProposalSnapshot
export type LiveDecisionConfiguration = DecisionConfiguration
export type LiveDecisionState = DecisionState
export type LiveInterventionModule = InterventionModuleDescriptor
export type GroupedLiveInterventionModules = LiveInterventionModuleGroup[]

export type ActiveLiveExperimentSession = ExperimentSessionSnapshot & {
  readingSession: LiveReadingSessionSnapshot
}
