"use client"

import * as React from "react"
import { Eye, ListChecks, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatReplayClock, type ReplayFrame, type ReplayKeyEvent } from "@/lib/experiment-replay"
import type { LiveReadingSessionSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { formatEventKind, getEventTone } from "@/modules/pages/replay/utils"

type ReplayMetadataColumnProps = {
  frame: ReplayFrame
  readingSession: LiveReadingSessionSnapshot
  activeWord: string | null | undefined
  replayEvents: ReplayKeyEvent[]
  activeEventIndex: number
  onSeek: (timeMs: number) => void
}

// How long an intervention / context-recovery counts as "happening now" from the current replay time.
const RECENT_EVENT_WINDOW_MS = 6000

type FilterKey = "all" | "quiz" | "intervention" | "lifecycle"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quiz", label: "Quiz" },
  { key: "intervention", label: "Interventions" },
  { key: "lifecycle", label: "Lifecycle" },
]

function eventMatchesFilter(event: ReplayKeyEvent, filter: FilterKey) {
  if (filter === "all") return true
  if (filter === "quiz") return event.kind === "quiz"
  if (filter === "intervention") return event.kind === "intervention" || event.kind === "proposal"
  if (filter === "lifecycle") return event.kind === "lifecycle" || event.kind === "state" || event.kind === "recovery" || event.kind === "connection"
  return true
}

export function ReplayMetadataColumn({
  frame,
  readingSession,
  activeWord,
  replayEvents,
  activeEventIndex,
  onSeek,
}: ReplayMetadataColumnProps) {
  const [filter, setFilter] = React.useState<FilterKey>("all")

  const participant = frame.session.participant
  const focus = readingSession.focus
  const focusLabel = focus.isInsideReadingArea
    ? activeWord ?? "Inside reading area"
    : "Outside reading area"

  const recentIntervention = readingSession.latestIntervention
  const recentInterventionFresh =
    recentIntervention !== null &&
    frame.session.startedAtUnixMs > 0 &&
    Math.abs(
      (recentIntervention.appliedAtUnixMs - frame.session.startedAtUnixMs) - frame.currentTimeMs
    ) <= RECENT_EVENT_WINDOW_MS

  const recentContext = readingSession.latestContextPreservation
  const recentContextFresh =
    recentContext !== null &&
    frame.session.startedAtUnixMs > 0 &&
    Math.abs(
      (recentContext.measuredAtUnixMs - frame.session.startedAtUnixMs) - frame.currentTimeMs
    ) <= RECENT_EVENT_WINDOW_MS

  const visibleEvents = replayEvents.filter((event) => eventMatchesFilter(event, filter))

  return (
    <div className="order-3 min-h-0 min-w-0 overflow-hidden xl:order-3">
      <div className="flex h-full min-h-0 flex-col gap-4">
        {/* Header strip — participant in one band, no card chrome. */}
        <div className="rounded-2xl border bg-card/80 px-5 py-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Participant</p>
          <p className="mt-1 truncate text-lg font-semibold">{participant?.name ?? "Unknown"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[
              participant?.age != null ? `${participant.age}y` : null,
              participant?.sex ?? null,
              `Page ${readingSession.participantViewport.activePageIndex + 1}/${readingSession.participantViewport.pageCount}`,
              frame.session.signalSources.gazeSource && frame.session.signalSources.gazeSource !== "none"
                ? `gaze: ${frame.session.signalSources.gazeSource}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* "At this moment" card — surfaces only what's currently relevant. */}
        <Card className="rounded-2xl bg-card/96 shadow-sm">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-3.5" />
              <span className="text-[10px] uppercase tracking-[0.22em]">At this moment</span>
            </div>

            {frame.quiz?.isActive ? (
              <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">
                    {frame.quiz.questionIndex !== null
                      ? `Q${frame.quiz.questionIndex + 1}${frame.quiz.questionCount ? `/${frame.quiz.questionCount}` : ""}`
                      : "Quiz"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {frame.quiz.timeOnQuestionMs !== null
                      ? formatReplayClock(frame.quiz.timeOnQuestionMs)
                      : "—"}
                  </span>
                </div>
                {frame.quiz.prompt ? (
                  <p className="mt-3 text-sm leading-6">{frame.quiz.prompt}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {frame.quiz.selectedOptionId
                    ? `Selected — ${frame.quiz.selectedOptionId}`
                    : "No selection yet"}
                  {frame.quiz.selectionChangeCount > 0
                    ? ` · ${frame.quiz.selectionChangeCount} change${frame.quiz.selectionChangeCount === 1 ? "" : "s"}`
                    : ""}
                  {frame.quiz.activeRegionType
                    ? ` · looking at ${frame.quiz.activeRegionType}${frame.quiz.activeOptionId ? ` (${frame.quiz.activeOptionId})` : ""}`
                    : ""}
                </p>
              </div>
            ) : null}

            {recentInterventionFresh && recentIntervention ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">Intervention · {recentIntervention.source}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6">{recentIntervention.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentIntervention.appliedBoundary}
                  {recentIntervention.waitDurationMs !== null
                    ? ` · waited ${recentIntervention.waitDurationMs} ms`
                    : ""}
                </p>
              </div>
            ) : null}

            {recentContextFresh && recentContext ? (
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">Context — {recentContext.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {recentContext.anchorSource}
                  {recentContext.waitDurationMs !== null
                    ? ` · waited ${recentContext.waitDurationMs} ms`
                    : ""}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="size-3.5" />
                <span className="text-[10px] uppercase tracking-[0.18em]">Focus</span>
              </div>
              <p className="mt-1 text-sm font-medium">{focusLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {readingSession.presentation.fontFamily}, {readingSession.presentation.fontSizePx}px
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline — fills the rest. */}
        <Card className="flex min-h-0 flex-1 flex-col rounded-2xl bg-card/96 shadow-sm">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="size-3.5" />
              <span className="text-[10px] uppercase tracking-[0.22em]">Timeline</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {visibleEvents.length} of {replayEvents.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    filter === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-3">
                {visibleEvents.length === 0 ? (
                  <p className="rounded-xl border border-dashed bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                    No events for this filter.
                  </p>
                ) : (
                  visibleEvents.map((event) => {
                    const originalIndex = replayEvents.indexOf(event)
                    const isActive = originalIndex === activeEventIndex
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={cn(
                          "block w-full rounded-xl border px-3 py-2 text-left transition-colors",
                          getEventTone(event.kind, isActive)
                        )}
                        onClick={() => onSeek(event.timeMs)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={isActive ? "default" : "outline"} className="text-[10px]">
                            {formatEventKind(event.kind)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatReplayClock(event.timeMs)}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium">{event.title}</p>
                        {event.detail ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.detail}</p>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
