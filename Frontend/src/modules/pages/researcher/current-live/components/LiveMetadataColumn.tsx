"use client"

import { useMemo, type ReactNode } from "react"

import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  DecisionConfiguration,
  DecisionState,
  DecisionProposalIntervention,
  ExperimentLiveMonitoringSnapshot,
  InterventionEventSnapshot,
  LiveReadingSessionSnapshot,
} from "@/lib/experiment-session"
import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"
import { cn } from "@/lib/utils"
import type { RemoteTokenAttentionStats } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import type {
  ActiveLiveExperimentSession,
  LiveMirrorTrustState,
} from "@/modules/pages/researcher/current-live/types"
import { formatAbsoluteTime, formatDurationMs, formatNumeric } from "@/modules/pages/researcher/current-live/utils"

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  )
}

function MetricTile({
  label,
  value,
  mono = false,
  className,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 min-w-0 truncate text-sm font-medium text-foreground",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </p>
    </div>
  )
}

type LiveMetadataColumnProps = {
  interventionModules: InterventionModuleDescriptor[]
  session: ActiveLiveExperimentSession
  readingSession: LiveReadingSessionSnapshot
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  mirrorTrustState: LiveMirrorTrustState
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
  interventionModules,
  session,
  readingSession,
  liveMonitoring,
  mirrorTrustState,
  decisionConfiguration,
  decisionState,
  activeWord,
  activeBlockLix,
  documentLix,
  followParticipant,
  topAttentionTokens,
}: LiveMetadataColumnProps) {
  const moduleLookup = useMemo(
    () => new Map(interventionModules.map((module) => [module.moduleId, module] as const)),
    [interventionModules]
  )

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

              {/* ── Participant ── */}
              <div className="rounded-xl border bg-background/80 px-4 py-3">
                <p className="text-sm font-semibold">{session.participant?.name ?? "Unknown"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    session.participant?.age,
                    session.participant?.sex,
                    session.participant?.existingEyeCondition,
                    session.participant?.readingProficiency,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No participant details"}
                </p>
              </div>

              {/* ── Session config ── */}
              <div className="space-y-1.5">
                <SectionLabel>Session</SectionLabel>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-background/80 px-4 py-3">
                  <MetricTile
                    label="Document"
                    value={readingSession.content?.title ?? "-"}
                    className="col-span-2"
                  />
                  <MetricTile label="Condition" value={decisionConfiguration.conditionLabel} />
                  <MetricTile label="Provider" value={decisionConfiguration.providerId} />
                  <MetricTile label="Execution" value={decisionConfiguration.executionMode} />
                  <MetricTile label="Eyetracker" value={session.eyeTrackerDevice?.name ?? "-"} />
                  <MetricTile
                    label="Mirror"
                    value={followParticipant ? "Following" : "Manual"}
                  />
                  <MetricTile
                    label="Presentation"
                    value={`${readingSession.presentation.fontFamily}, ${readingSession.presentation.fontSizePx}px`}
                  />
                </div>
              </div>

              {/* ── Live reading state ── */}
              <div className="space-y-1.5">
                <SectionLabel>Live</SectionLabel>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3 rounded-xl border bg-background/80 px-4 py-3">
                  <MetricTile
                    label="Focus"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? activeWord ?? "In area"
                        : "Outside"
                    }
                    className="col-span-2"
                  />
                  <MetricTile
                    label="Samples"
                    value={session.receivedGazeSamples.toLocaleString()}
                    mono
                  />
                  <MetricTile
                    label="Coordinates"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? `${formatNumeric(readingSession.focus.normalizedContentX, 3)}, ${formatNumeric(readingSession.focus.normalizedContentY, 3)}`
                        : "—"
                    }
                    mono
                    className="col-span-2"
                  />
                  <MetricTile
                    label="Viewport"
                    value={`${Math.round(readingSession.participantViewport.viewportWidthPx)}×${Math.round(readingSession.participantViewport.viewportHeightPx)}`}
                    mono
                  />
                  <MetricTile
                    label="Page"
                    value={`${readingSession.participantViewport.activePageIndex + 1}/${readingSession.participantViewport.pageCount}`}
                    mono
                  />
                  <MetricTile label="Doc LIX" value={formatNumeric(documentLix, 1)} mono />
                  <MetricTile label="Block LIX" value={formatNumeric(activeBlockLix, 1)} mono />
                </div>
              </div>

              {/* ── Signals ── */}
              <div className="space-y-1.5">
                <SectionLabel>Signals</SectionLabel>
                <div className="space-y-2 rounded-xl border bg-background/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{mirrorTrustState.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {liveMonitoring.hasParticipantViewportData
                        ? "Viewport measured"
                        : "Viewport pending"}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {mirrorTrustState.detail}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2">
                    <MetricTile
                      label="Viewport"
                      value={
                        liveMonitoring.hasParticipantViewConnection
                          ? liveMonitoring.hasParticipantViewportData
                            ? "Measured"
                            : "Waiting"
                          : "Offline"
                      }
                    />
                    <MetricTile
                      label="Focus"
                      value={
                        liveMonitoring.hasReadingFocusSignal ? "Live" : "Waiting"
                      }
                    />
                    <MetricTile
                      label="Last turn"
                      value={
                        readingSession.participantViewport.lastPageTurnAtUnixMs
                          ? formatAbsoluteTime(readingSession.participantViewport.lastPageTurnAtUnixMs)
                          : "-"
                      }
                      mono
                    />
                  </div>
                </div>
              </div>

              {/* ── Context preservation ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Context preservation</SectionLabel>
                  <Badge
                    variant={
                      readingSession.latestContextPreservation?.status === "failed"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {readingSession.latestContextPreservation?.status ?? "pending"}
                  </Badge>
                </div>

                {readingSession.latestContextPreservation ? (
                  <div className="space-y-2 rounded-xl border bg-background/80 px-4 py-3">
                    <p className="text-xs leading-5 text-muted-foreground">
                      {readingSession.latestContextPreservation.anchorSource}
                      {readingSession.latestContextPreservation.reason
                        ? ` · ${readingSession.latestContextPreservation.reason}`
                        : ""}
                    </p>
                    <div className="grid grid-cols-3 gap-x-4 border-t pt-2">
                      <MetricTile
                        label="Anchor err"
                        value={`${formatNumeric(readingSession.latestContextPreservation.anchorErrorPx, 1)} px`}
                        mono
                      />
                      <MetricTile
                        label="VP delta"
                        value={`${formatNumeric(readingSession.latestContextPreservation.viewportDeltaPx, 1)} px`}
                        mono
                      />
                      <MetricTile
                        label="Measured"
                        value={formatAbsoluteTime(
                          readingSession.latestContextPreservation.measuredAtUnixMs
                        )}
                        mono
                      />
                      <MetricTile
                        label="Sentence"
                        value={readingSession.latestContextPreservation.anchorSentenceId ?? "-"}
                        mono
                        className="col-span-2"
                      />
                      <MetricTile
                        label="Boundary"
                        value={readingSession.latestContextPreservation.commitBoundary}
                      />
                      <MetricTile
                        label="Wait"
                        value={
                          readingSession.latestContextPreservation.waitDurationMs === null
                            ? "-"
                            : `${readingSession.latestContextPreservation.waitDurationMs} ms`
                        }
                        mono
                      />
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                    Waiting for layout-changing intervention.
                  </p>
                )}
              </div>

              {/* ── Continuity history ── */}
              <div className="space-y-1.5">
                <SectionLabel>Pending intervention</SectionLabel>
                {readingSession.pendingIntervention ? (
                  <div className="rounded-xl border bg-background/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{readingSession.pendingIntervention.status}</Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatAbsoluteTime(readingSession.pendingIntervention.queuedAtUnixMs)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-foreground">
                      {readingSession.pendingIntervention.intervention.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {readingSession.pendingIntervention.requestedBoundary}
                      {readingSession.pendingIntervention.fallbackBoundary
                        ? ` · fallback ${readingSession.pendingIntervention.fallbackBoundary}`
                        : ""}
                      {readingSession.pendingIntervention.waitDurationMs !== null
                        ? ` · waited ${readingSession.pendingIntervention.waitDurationMs} ms`
                        : ""}
                      {readingSession.pendingIntervention.resolutionReason
                        ? ` · ${readingSession.pendingIntervention.resolutionReason}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                    No queued intervention.
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <SectionLabel>Continuity history</SectionLabel>
                  <Badge variant="outline">
                    {readingSession.recentContextPreservationEvents.length}
                  </Badge>
                </div>

                {readingSession.recentContextPreservationEvents.length > 0 ? (
                  <div className="divide-y">
                    {readingSession.recentContextPreservationEvents.map((event) => (
                      <div
                        key={`${event.measuredAtUnixMs}:${event.anchorSource}:${event.anchorTokenId ?? event.anchorBlockId ?? "none"}`}
                        className="px-4 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                event.status === "failed" ? "destructive" : "outline"
                              }
                            >
                              {event.status}
                            </Badge>
                            <Badge variant="secondary">{event.anchorSource}</Badge>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatAbsoluteTime(event.measuredAtUnixMs)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                          err {formatNumeric(event.anchorErrorPx, 1)} px · vp{" "}
                          {formatNumeric(event.viewportDeltaPx, 1)} px
                          {event.commitBoundary ? ` · ${event.commitBoundary}` : ""}
                          {event.waitDurationMs !== null ? ` · wait ${event.waitDurationMs} ms` : ""}
                          {event.reason ? ` · ${event.reason}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    No continuity samples yet.
                  </p>
                )}
              </div>

              {/* ── Decision state ── */}
              <div className="space-y-1.5">
                <SectionLabel>Decision</SectionLabel>
                <div className="rounded-xl border bg-background/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">
                      {decisionState.automationPaused ? "Paused" : "Active"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {decisionConfiguration.providerId} · {decisionConfiguration.executionMode}
                    </span>
                  </div>
                  {decisionState.activeProposal ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {decisionState.activeProposal.rationale}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* ── Latest intervention ── */}
              {readingSession.latestIntervention ? (
                <div className="space-y-1.5">
                  <SectionLabel>Latest intervention</SectionLabel>
                  <div className="rounded-xl border bg-background/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">
                          {readingSession.latestIntervention.source}
                        </Badge>
                        <Badge variant="secondary">
                          {getModuleDisplayName(
                            moduleLookup,
                            readingSession.latestIntervention.moduleId
                          )}
                        </Badge>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatAbsoluteTime(
                          readingSession.latestIntervention.appliedAtUnixMs
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-foreground">
                      {readingSession.latestIntervention.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInterventionParameters(
                        moduleLookup,
                        readingSession.latestIntervention
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {readingSession.latestIntervention.appliedBoundary}
                      {readingSession.latestIntervention.waitDurationMs !== null
                        ? ` · waited ${readingSession.latestIntervention.waitDurationMs} ms`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* ── Strongest fixations ── */}
              <div className="rounded-xl border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <SectionLabel>Strongest fixations</SectionLabel>
                  <Badge variant="outline">{topAttentionTokens.length}</Badge>
                </div>
                {topAttentionTokens.length > 0 ? (
                  <div className="divide-y">
                    {topAttentionTokens.map((token) => (
                      <div
                        key={token.tokenId}
                        className="flex items-baseline justify-between gap-3 px-4 py-2"
                      >
                        <span className="text-sm font-medium">{token.tokenText}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatDurationMs(token.maxFixationMs)} max · {token.fixationCount}×
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    Waiting for attention data.
                  </p>
                )}
              </div>

              {/* ── Proposal history ── */}
              <div className="rounded-xl border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <SectionLabel>Proposal history</SectionLabel>
                  <Badge variant="outline">
                    {decisionState.recentProposalHistory.length}
                  </Badge>
                </div>

                {decisionState.recentProposalHistory.length > 0 ? (
                  <div className="divide-y">
                    {decisionState.recentProposalHistory.map((proposal) => (
                      <div key={proposal.proposalId} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{proposal.status}</Badge>
                            <Badge variant="secondary">
                              {getModuleDisplayName(
                                moduleLookup,
                                proposal.proposedIntervention.moduleId
                              )}
                            </Badge>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatAbsoluteTime(
                              proposal.resolvedAtUnixMs ?? proposal.proposedAtUnixMs
                            )}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-medium leading-5">
                          {proposal.rationale}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatProposalParameters(
                            moduleLookup,
                            proposal.proposedIntervention
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    No proposals yet.
                  </p>
                )}
              </div>

              {/* ── Applied interventions ── */}
              <div className="rounded-xl border bg-background/80">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <SectionLabel>Applied interventions</SectionLabel>
                  <Badge variant="outline">
                    {readingSession.recentInterventions.length}
                  </Badge>
                </div>

                {readingSession.recentInterventions.length > 0 ? (
                  <div className="divide-y">
                    {readingSession.recentInterventions.map((event) => (
                      <div key={event.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{event.source}</Badge>
                            <Badge variant="secondary">
                              {getModuleDisplayName(moduleLookup, event.moduleId)}
                            </Badge>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatAbsoluteTime(event.appliedAtUnixMs)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-medium leading-5">
                          {event.reason}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatInterventionParameters(moduleLookup, event)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    No interventions yet.
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

function getModuleDisplayName(
  moduleLookup: Map<string, InterventionModuleDescriptor>,
  moduleId: string | null
) {
  if (!moduleId) {
    return "Legacy patch"
  }

  return moduleLookup.get(moduleId)?.displayName ?? moduleId
}

function formatParameterValue(
  moduleLookup: Map<string, InterventionModuleDescriptor>,
  moduleId: string | null,
  parameters: Record<string, string | null> | null
) {
  if (!parameters) {
    return "No module parameters recorded."
  }

  if (!moduleId) {
    return formatRawParameters(parameters)
  }

  const moduleDescriptor = moduleLookup.get(moduleId)
  if (!moduleDescriptor) {
    return formatRawParameters(parameters)
  }

  const formatted = moduleDescriptor.parameters.flatMap((parameter) => {
    const rawValue = parameters[parameter.key]
    if (rawValue === undefined || rawValue === null) {
      return []
    }

    if (moduleId === "participant-edit-lock") {
      return rawValue === "true" ? "Participant editing locked" : "Participant editing unlocked"
    }

    const optionLabel =
      parameter.options.find((option) => option.value === rawValue)?.displayName ?? rawValue
    const suffix = parameter.unit ? ` ${parameter.unit}` : ""
    return `${parameter.displayName}: ${optionLabel}${suffix}`
  })

  return formatted.length > 0 ? formatted.join(" · ") : moduleDescriptor.description
}

function formatRawParameters(parameters: Record<string, string | null>) {
  const entries = Object.entries(parameters)
  if (entries.length === 0) {
    return "No module parameters recorded."
  }

  return entries.map(([key, value]) => `${key}: ${value ?? "-"}`).join(" · ")
}

function formatInterventionParameters(
  moduleLookup: Map<string, InterventionModuleDescriptor>,
  event: InterventionEventSnapshot
) {
  return formatParameterValue(moduleLookup, event.moduleId, event.parameters)
}

function formatProposalParameters(
  moduleLookup: Map<string, InterventionModuleDescriptor>,
  intervention: DecisionProposalIntervention
) {
  return formatParameterValue(moduleLookup, intervention.moduleId, intervention.parameters)
}
