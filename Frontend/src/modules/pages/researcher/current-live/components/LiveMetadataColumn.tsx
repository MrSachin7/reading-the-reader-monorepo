"use client"

import type { ReactNode } from "react"

import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  DecisionConfiguration,
  DecisionState,
  LiveReadingSessionSnapshot,
} from "@/lib/experiment-session"
import type { RemoteTokenAttentionStats } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import type { ActiveLiveExperimentSession } from "@/modules/pages/researcher/current-live/types"
import { formatAbsoluteTime, formatDurationMs, formatNumeric } from "@/modules/pages/researcher/current-live/utils"

function MetadataRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-4 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 font-medium text-foreground">{value}</dd>
    </div>
  )
}

type LiveMetadataColumnProps = {
  session: ActiveLiveExperimentSession
  readingSession: LiveReadingSessionSnapshot
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
  activeWord: string | null
  activeBlockLix: number | null
  documentLix: number | null
  followParticipant: boolean
  topAttentionTokens: Array<
    {
      tokenId: string
      tokenText: string
    } & RemoteTokenAttentionStats
  >
}

export function LiveMetadataColumn({
  session,
  readingSession,
  decisionConfiguration,
  decisionState,
  activeWord,
  activeBlockLix,
  documentLix,
  followParticipant,
  topAttentionTokens,
}: LiveMetadataColumnProps) {
  return (
    <div className="order-3 min-h-0 min-w-0 overflow-hidden xl:order-3">
      <Card className="h-full min-h-0 rounded-[1.6rem] bg-card/96 shadow-sm">
        <CardContent className="min-h-0 pt-6">
          <ScrollArea className="h-56 xl:h-full">
            <div className="space-y-4 pr-4">
              <ExperimentCompletionActions
                session={session}
                source="researcher-live-view"
                className="w-full items-stretch [&>div:first-child]:w-full [&>div:first-child]:flex-col [&>div:first-child]:items-stretch [&_button]:w-full"
              />

              <div className="overflow-hidden rounded-[1.2rem] border bg-background/80">
                <dl className="divide-y">
                  <MetadataRow label="Participant" value={session.participant?.name ?? "Unknown"} />
                  <MetadataRow label="Age" value={session.participant?.age ?? "-"} />
                  <MetadataRow label="Sex" value={session.participant?.sex ?? "-"} />
                  <MetadataRow
                    label="Eye condition"
                    value={session.participant?.existingEyeCondition ?? "-"}
                  />
                  <MetadataRow
                    label="Proficiency"
                    value={session.participant?.readingProficiency ?? "-"}
                  />
                  <MetadataRow label="Eyetracker" value={session.eyeTrackerDevice?.name ?? "-"} />
                  <MetadataRow label="Document" value={readingSession.content?.title ?? "-"} />
                  <MetadataRow label="Condition" value={decisionConfiguration.conditionLabel} />
                  <MetadataRow label="Provider" value={decisionConfiguration.providerId} />
                  <MetadataRow label="Execution" value={decisionConfiguration.executionMode} />
                  <MetadataRow
                    label="Focus"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? activeWord ?? "Inside area"
                        : "Outside area"
                    }
                  />
                  <MetadataRow
                    label="Coordinates"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? `${formatNumeric(readingSession.focus.normalizedContentX, 3)}, ${formatNumeric(readingSession.focus.normalizedContentY, 3)}`
                        : "-"
                    }
                  />
                  <MetadataRow
                    label="Viewport"
                    value={`${Math.round(readingSession.participantViewport.viewportWidthPx)} x ${Math.round(readingSession.participantViewport.viewportHeightPx)}`}
                  />
                  <MetadataRow
                    label="Mirror mode"
                    value={followParticipant ? "Following participant" : "Free researcher scroll"}
                  />
                  <MetadataRow
                    label="Presentation"
                    value={`${readingSession.presentation.fontFamily}, ${readingSession.presentation.fontSizePx}px`}
                  />
                  <MetadataRow label="Document LIX" value={formatNumeric(documentLix, 1)} />
                  <MetadataRow label="Focused block" value={formatNumeric(activeBlockLix, 1)} />
                  <MetadataRow label="Samples" value={session.receivedGazeSamples.toLocaleString()} />
                </dl>
              </div>

              <div className="rounded-[1.2rem] border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Decision state</p>
                <div className="mt-3 rounded-[1rem] border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">
                      {decisionState.automationPaused ? "Automation paused" : "Automation active"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {decisionConfiguration.providerId} · {decisionConfiguration.executionMode}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6">
                    {decisionState.activeProposal?.rationale ?? "No active proposal."}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.2rem] border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest intervention</p>
                <div className="mt-3">
                  {readingSession.latestIntervention ? (
                    <div className="rounded-[1rem] border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline">{readingSession.latestIntervention.source}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatAbsoluteTime(readingSession.latestIntervention.appliedAtUnixMs)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6">{readingSession.latestIntervention.reason}</p>
                    </div>
                  ) : (
                    <div className="rounded-[1rem] border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                      No intervention yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.2rem] border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Strongest fixations
                  </p>
                  <Badge variant="outline">{topAttentionTokens.length}</Badge>
                </div>
                {topAttentionTokens.length > 0 ? (
                  <div className="divide-y">
                    {topAttentionTokens.map((token) => (
                      <div key={token.tokenId} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{token.tokenText}</span>
                          <span className="text-xs text-muted-foreground">
                            max {formatDurationMs(token.maxFixationMs)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          avg {formatDurationMs(token.fixationCount > 0 ? token.fixationMs / token.fixationCount : null)} • total {formatDurationMs(token.fixationMs)} • {token.fixationCount} fixations • {token.skimCount} skims
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    Waiting for stable reading attention data.
                  </p>
                )}
              </div>

              <div className="rounded-[1.2rem] border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Proposal history
                  </p>
                  <Badge variant="outline">{decisionState.recentProposalHistory.length}</Badge>
                </div>

                {decisionState.recentProposalHistory.length > 0 ? (
                  <div className="divide-y">
                    {decisionState.recentProposalHistory.map((proposal) => (
                      <div key={proposal.proposalId} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{proposal.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatAbsoluteTime(proposal.resolvedAtUnixMs ?? proposal.proposedAtUnixMs)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium leading-5">{proposal.rationale}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {proposal.conditionLabel} · {proposal.providerId} · {proposal.executionMode}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    No reviewed or superseded proposals yet.
                  </p>
                )}
              </div>

              <div className="rounded-[1.2rem] border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Applied interventions
                  </p>
                  <Badge variant="outline">{readingSession.recentInterventions.length}</Badge>
                </div>

                {readingSession.recentInterventions.length > 0 ? (
                  <div className="divide-y">
                    {readingSession.recentInterventions.map((event) => (
                      <div key={event.id} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{event.source}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatAbsoluteTime(event.appliedAtUnixMs)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium leading-5">{event.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.appliedPresentation.fontFamily}, {event.appliedPresentation.fontSizePx}px,{" "}
                          {event.appliedPresentation.lineWidthPx}px
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    No interventions have been issued in this session yet.
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
