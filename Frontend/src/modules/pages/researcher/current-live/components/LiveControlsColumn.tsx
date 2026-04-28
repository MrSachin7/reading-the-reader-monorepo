"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Activity, ArrowRight, Check, Keyboard, Pause, Play, User, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import type {
  DecisionConfiguration,
  DecisionState,
  ExperimentLiveMonitoringSnapshot,
  ExternalProviderStatusSnapshot,
  LayoutInterventionGuardrailSnapshot,
} from "@/lib/experiment-session"
import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { cn } from "@/lib/utils"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import { summarizeProposalChanges } from "@/modules/pages/researcher/current-live/lib/intervention-helpers"
import type { LiveMirrorTrustState, LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"
import {
  formatDurationMs,
  formatPercent,
  getLatencyBars,
  getLatencyTone,
  getLiveHealthState,
} from "@/modules/pages/researcher/current-live/utils"

type LiveControlsColumnProps = {
  interventionModules: InterventionModuleDescriptor[]
  followParticipant: boolean
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  mirrorTrustState: LiveMirrorTrustState
  layoutGuardrail: LayoutInterventionGuardrailSnapshot | null
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
  externalProviderStatus: ExternalProviderStatusSnapshot
  activeWord: string | null
  participantName: string | null
  sampleRateHz: number
  validityRate: number
  latencyMs: number | null
  readingDynamicsEnabled: boolean
  currentFixationDurationMs: number | null
  fixatedTokenCount: number
  skimmedTokenCount: number
  appearance: ReaderAppearanceSettings
  presentation: ReadingPresentationSettings
  readerOptions: LiveReaderOptions
  onFollowParticipantChange: (checked: boolean) => void
  onReaderOptionChange: (key: keyof LiveReaderOptions, value: boolean) => void
  onApproveProposal: (proposalId: string) => void
  onRejectProposal: (proposalId: string) => void
  onPauseAutomation: () => void
  onResumeAutomation: () => void
  onExecutionModeChange: (executionMode: string) => void
  experimentTextCount: number
  currentExperimentTextIndex: number | null
  canAdvanceExperimentText: boolean
  isAdvancingExperimentText: boolean
  experimentSequenceError: string | null
  onAdvanceExperimentText: () => void
}

export function LiveControlsColumn({
  interventionModules,
  followParticipant,
  liveMonitoring,
  mirrorTrustState,
  layoutGuardrail,
  decisionConfiguration,
  decisionState,
  externalProviderStatus,
  activeWord,
  participantName,
  sampleRateHz,
  validityRate,
  latencyMs,
  readingDynamicsEnabled,
  currentFixationDurationMs,
  fixatedTokenCount,
  skimmedTokenCount,
  appearance,
  presentation,
  readerOptions,
  onFollowParticipantChange,
  onReaderOptionChange,
  onApproveProposal,
  onRejectProposal,
  onPauseAutomation,
  onResumeAutomation,
  onExecutionModeChange,
  experimentTextCount,
  currentExperimentTextIndex,
  canAdvanceExperimentText,
  isAdvancingExperimentText,
  experimentSequenceError,
  onAdvanceExperimentText,
}: LiveControlsColumnProps) {
  const [isReaderControlsOpen, setIsReaderControlsOpen] = useState(false)
  const isExactMirror = mirrorTrustState.kind === "exact"
  const liveHealth = getLiveHealthState({
    sampleRateHz,
    validityRate,
    latencyMs,
    hasParticipantViewConnection: liveMonitoring.hasParticipantViewConnection,
    hasParticipantViewportData: liveMonitoring.hasParticipantViewportData,
  })
  const isExternalDecisionMode = decisionConfiguration.providerId === "external"
  const isExternalDecisionUnavailable =
    isExternalDecisionMode && !externalProviderStatus.isConnected
  const activeProposalChangeSummary = decisionState.activeProposal
    ? summarizeProposalChanges(
        decisionState.activeProposal,
        presentation,
        appearance,
        interventionModules
      )
    : []

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReaderControlsOpen(false)
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() === "v") {
        if (!isReaderControlsOpen && isInteractiveTarget(event.target)) {
          return
        }

        event.preventDefault()
        setIsReaderControlsOpen((previous) => !previous)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isReaderControlsOpen])

  return (
    <Sheet open={isReaderControlsOpen} onOpenChange={setIsReaderControlsOpen}>
      <div className="order-2 flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden xl:order-1">
        <Card className="rounded-2xl bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-3.5" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">Participant</span>
                </div>
                <p className="mt-1 truncate text-base font-semibold">
                  {participantName ?? "Not registered"}
                </p>
              </div>
              <HealthPill tone={liveHealth.tone as "positive" | "warning" | "negative"} label={liveHealth.label} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {mirrorTrustState.headline} · {liveHealth.detail}
            </p>
          </CardContent>
        </Card>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-4">
            <Card className="rounded-2xl bg-card/96 shadow-sm">
              <CardContent className="pt-6">
                <SectionHeader icon={<Activity className="size-3.5" />} title="Signals" />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Stat label="Sample rate" value={`${sampleRateHz} Hz`} />
                  <Stat label="Validity" value={formatPercent(validityRate)} />
                  <Stat
                    label="Latency"
                    value={
                      <span className="flex items-center gap-2">
                        <span>{latencyMs === null ? "—" : `${latencyMs} ms`}</span>
                        <LatencySignal latencyMs={latencyMs} />
                      </span>
                    }
                  />
                  <Stat label="Mirror" value={mirrorTrustState.label} />
                  <Stat label="Current word" value={activeWord ?? "—"} className="col-span-2" />
                  <Stat
                    label="Viewport"
                    value={
                      liveMonitoring.hasParticipantViewportData
                        ? "Measured"
                        : liveMonitoring.hasParticipantViewConnection
                          ? "Pending"
                          : "Offline"
                    }
                  />
                  <Stat label="Heat map" value={readingDynamicsEnabled ? "Live" : "Off"} />
                  {readingDynamicsEnabled ? (
                    <>
                      <Stat label="Current dwell" value={formatDurationMs(currentFixationDurationMs)} />
                      <Stat label="Fixated" value={fixatedTokenCount} />
                      <Stat label="Skimmed" value={skimmedTokenCount} />
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Follow participant</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {followParticipant ? "Synced live" : "Manual view"}
                    </p>
                  </div>
                  <Switch checked={followParticipant} onCheckedChange={onFollowParticipantChange} />
                </div>
              </CardContent>
            </Card>

            {experimentTextCount > 1 ? (
              <Card className="rounded-2xl bg-card/96 shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader icon={<ArrowRight className="size-3.5" />} title="Experiment sequence" />
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">Current text</p>
                      <Badge variant="outline">
                        {currentExperimentTextIndex === null
                          ? "Unknown"
                          : `${currentExperimentTextIndex + 1} / ${experimentTextCount}`}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      variant="outline"
                      disabled={!canAdvanceExperimentText || isAdvancingExperimentText}
                      onClick={onAdvanceExperimentText}
                    >
                      <ArrowRight className="size-3.5" />
                      {isAdvancingExperimentText ? "Loading next text..." : "Next text"}
                    </Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Move the live reading session to the next saved text in the selected experiment.
                    </p>
                    {experimentSequenceError ? (
                      <p className="text-xs leading-5 text-rose-700 dark:text-rose-300">
                        {experimentSequenceError}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-2xl bg-card/96 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Decision
                    </p>
                    <p className="mt-1 text-sm font-semibold">{decisionConfiguration.conditionLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {decisionConfiguration.providerId}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      decisionState.automationPaused && "border-amber-500/40 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {decisionState.automationPaused ? "Paused" : "Active"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-muted/50 p-1">
                  {(["advisory", "autonomous"] as const).map((mode) => {
                    const isActive = decisionConfiguration.executionMode === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={isExternalDecisionUnavailable && !isActive}
                        onClick={() => {
                          if (!isActive) onExecutionModeChange(mode)
                        }}
                        className={cn(
                          "rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                          isExternalDecisionUnavailable && !isActive && "cursor-not-allowed opacity-40"
                        )}
                      >
                        {mode}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  {decisionConfiguration.executionMode === "autonomous"
                    ? "Validated decisions apply automatically."
                    : "Requires researcher approval before applying."}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() =>
                    decisionState.automationPaused ? onResumeAutomation() : onPauseAutomation()
                  }
                >
                  {decisionState.automationPaused ? (
                    <>
                      <Play className="size-3.5" />
                      Resume automation
                    </>
                  ) : (
                    <>
                      <Pause className="size-3.5" />
                      Pause automation
                    </>
                  )}
                </Button>

                {isExternalDecisionMode ? (
                  <div
                    className={cn(
                      "mt-3 rounded-lg border px-3 py-2 text-xs leading-5",
                      isExternalDecisionUnavailable
                        ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                        : "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                    )}
                  >
                    {isExternalDecisionUnavailable
                      ? "External provider disconnected — autonomous execution blocked."
                      : `${externalProviderStatus.displayName ?? "External provider"} connected.`}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {decisionState.activeProposal ? (
              <Card className="rounded-2xl border-2 border-primary/35 bg-primary/5 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Active proposal</p>
                    <Badge className="bg-emerald-600 text-white">Awaiting action</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-foreground">
                    {decisionState.activeProposal.rationale}
                  </p>

                  {activeProposalChangeSummary.length > 0 ? (
                    <div className="mt-3 space-y-1 rounded-lg border bg-background/70 px-3 py-2">
                      {activeProposalChangeSummary.map((change) => (
                        <p key={change} className="text-xs font-medium">
                          {change}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onApproveProposal(decisionState.activeProposal!.proposalId)}
                    >
                      <Check className="size-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                      onClick={() => onRejectProposal(decisionState.activeProposal!.proposalId)}
                    >
                      <X className="size-3.5" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {layoutGuardrail ? (
              <Card className="rounded-2xl bg-card/96 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Layout guardrail</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-wider",
                        layoutGuardrail.status === "suppressed"
                          ? "border-amber-500/35 text-amber-700 dark:text-amber-300"
                          : "border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {layoutGuardrail.status === "suppressed" ? "Holding" : "Applied"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {layoutGuardrail.reason ?? "Latest layout change was accepted."}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <SheetTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between rounded-2xl border bg-card/96 px-5 py-4 text-left shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <Keyboard className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Reader view options</p>
                    <p className="text-[11px] text-muted-foreground">Heat map, gaze, chrome</p>
                  </div>
                </div>
                <Kbd>V</Kbd>
              </button>
            </SheetTrigger>
          </div>
        </ScrollArea>

        <SheetContent side="left" className="w-[22rem] sm:max-w-[22rem]">
          <SheetHeader className="border-b">
            <SheetTitle>Reader view controls</SheetTitle>
            <SheetDescription>Press Esc to close.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-5">
              <ControlSection title="Context">
                <ControlRow
                  label="Preserve context"
                  description="Keep the reading position anchored when presentation changes."
                  checked={readerOptions.preserveContextOnIntervention}
                  onCheckedChange={(checked) =>
                    onReaderOptionChange("preserveContextOnIntervention", checked)
                  }
                />
                <ControlRow
                  label="Highlight context"
                  description="Reveal the preserved anchor briefly after an intervention."
                  checked={readerOptions.highlightContext}
                  disabled={!readerOptions.preserveContextOnIntervention}
                  onCheckedChange={(checked) => onReaderOptionChange("highlightContext", checked)}
                />
              </ControlSection>

              <ControlSection title="Gaze and text">
                <ControlRow
                  label="Show fixation heat map"
                  description="Color tokens by accumulated fixation time and mark brief skims."
                  checked={readingDynamicsEnabled}
                  onCheckedChange={(checked) => onReaderOptionChange("showFixationHeatmap", checked)}
                />
                <ControlRow
                  label="Display gaze position"
                  description="Show the participant gaze marker inside the mirrored page."
                  checked={readerOptions.displayGazePosition}
                  onCheckedChange={(checked) => onReaderOptionChange("displayGazePosition", checked)}
                />
                <ControlRow
                  label="Highlight focused token"
                  description="Highlight the token the participant is currently focused on."
                  checked={readerOptions.highlightTokensBeingLookedAt}
                  onCheckedChange={(checked) =>
                    onReaderOptionChange("highlightTokensBeingLookedAt", checked)
                  }
                />
                <ControlRow
                  label="Show LIX scores"
                  description={
                    isExactMirror
                      ? "Show tiny readability badges as an overlay in exact mirror mode."
                      : "Display readability badges inside the mirrored page."
                  }
                  checked={readerOptions.showLixScores}
                  onCheckedChange={(checked) => onReaderOptionChange("showLixScores", checked)}
                />
              </ControlSection>

              <ControlSection title="Reader chrome">
                <ControlRow
                  label="Show toolbar"
                  description={
                    isExactMirror
                      ? "Unavailable in exact mirror mode."
                      : "Reveal the reader toolbar in the mirrored page."
                  }
                  checked={readerOptions.showToolbar}
                  disabled={isExactMirror}
                  onCheckedChange={(checked) => onReaderOptionChange("showToolbar", checked)}
                />
                <ControlRow
                  label="Show back button"
                  description={
                    isExactMirror
                      ? "Unavailable in exact mirror mode."
                      : "Only applies while the mirrored toolbar is visible."
                  }
                  checked={readerOptions.showBackButton}
                  disabled={isExactMirror || !readerOptions.showToolbar}
                  onCheckedChange={(checked) => onReaderOptionChange("showBackButton", checked)}
                />
              </ControlSection>
            </div>
          </div>
        </SheetContent>
      </div>
    </Sheet>
  )
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">{title}</span>
    </div>
  )
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 rounded-lg bg-muted/40 px-3 py-2", className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-1 min-w-0 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function HealthPill({
  tone,
  label,
}: {
  tone: "positive" | "warning" | "negative"
  label: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        tone === "positive" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "warning" && "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "negative" && "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "positive" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "negative" && "bg-rose-500"
        )}
      />
      {label}
    </span>
  )
}

function LatencySignal({ latencyMs }: { latencyMs: number | null | undefined }) {
  const bars = getLatencyBars(latencyMs)
  const tone = getLatencyTone(latencyMs)

  return (
    <div className={cn("flex items-end gap-0.5", tone)} aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full bg-current transition-opacity",
            index < bars ? "opacity-100" : "opacity-20"
          )}
          style={{ height: `${5 + index * 2}px` }}
        />
      ))}
    </div>
  )
}

function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function ControlRow({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2.5",
        disabled && "opacity-55"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  )
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest(
      "button, input, textarea, select, [contenteditable='true'], [role='combobox'], [role='switch']"
    )
  )
}
