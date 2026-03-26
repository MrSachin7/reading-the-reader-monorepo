"use client"

import { useEffect, useState, type ReactNode } from "react"

import { ModeToggle } from "@/components/theme/mode-toggle"
import { PaletteToggle } from "@/components/theme/palette-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { type FontTheme, FONTS } from "@/hooks/use-font-theme"
import type { DecisionConfiguration, DecisionState } from "@/lib/experiment-session"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { cn } from "@/lib/utils"
import { normalizeFontTheme, type ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"
import {
  formatDurationMs,
  formatPercent,
  getLatencyBars,
  getLatencyTone,
  PRESENTATION_FONT_LABELS,
} from "@/modules/pages/researcher/current-live/utils"

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
        "flex items-start justify-between gap-3 rounded-[1.1rem] border bg-background/80 px-4 py-3",
        disabled && "opacity-55"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
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

function MetricItem({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm leading-5 font-semibold break-words text-foreground">
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  )
}

function ThemePalette({
  value,
  onValueChange,
}: {
  value?: ReaderAppearanceSettings["palette"]
  onValueChange: (palette: ReaderAppearanceSettings["palette"]) => void
}) {
  return (
    <PaletteToggle
      value={value}
      onValueChange={onValueChange}
      appearance="flat"
      className="grid w-full grid-cols-3 [&>[data-slot=toggle-group-item]]:w-full [&>[data-slot=toggle-group-item]]:shrink [&>[data-slot=toggle-group-item]]:justify-center [&>[data-slot=toggle-group-item]]:px-0"
    />
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

function FollowParticipantRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-4">
      <div className="min-w-0">
        <p className="text-base font-semibold">Follow participant</p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-0 py-0 text-[10px] font-medium uppercase tracking-[0.18em]",
            checked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {checked ? "Synced live" : "Manual view"}
        </span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function LatencyValue({ latencyMs }: { latencyMs: number | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 break-words">{latencyMs === null ? "-" : `${latencyMs} ms`}</span>
      <LatencySignal latencyMs={latencyMs} />
    </div>
  )
}

function ControlSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function LatencySignal({ latencyMs }: { latencyMs: number | null | undefined }) {
  const bars = getLatencyBars(latencyMs)
  const tone = getLatencyTone(latencyMs)

  return (
    <div className={`flex items-end gap-0.5 ${tone}`} aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`w-1 rounded-full bg-current transition-opacity ${
            index < bars ? "opacity-100" : "opacity-20"
          }`}
          style={{ height: `${6 + index * 3}px` }}
        />
      ))}
    </div>
  )
}

type LiveControlsColumnProps = {
  followParticipant: boolean
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
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
  onReaderAppearanceChange: (
    next: Partial<ReaderAppearanceSettings>,
    reason: string
  ) => void
  onReaderOptionChange: (key: keyof LiveReaderOptions, value: boolean) => void
  onCommitIntervention: (
    next: { presentation?: Partial<ReadingPresentationSettings> },
    reason: string
  ) => void
  onApproveProposal: (proposalId: string) => void
  onRejectProposal: (proposalId: string) => void
  onPauseAutomation: () => void
  onResumeAutomation: () => void
  onExecutionModeChange: (executionMode: string) => void
}

export function LiveControlsColumn({
  followParticipant,
  decisionConfiguration,
  decisionState,
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
  onReaderAppearanceChange,
  onReaderOptionChange,
  onCommitIntervention,
  onApproveProposal,
  onRejectProposal,
  onPauseAutomation,
  onResumeAutomation,
  onExecutionModeChange,
}: LiveControlsColumnProps) {
  const [isReaderControlsOpen, setIsReaderControlsOpen] = useState(false)

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
        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <SectionLabel>Decision supervision</SectionLabel>

              <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                <p className="text-sm font-medium">{decisionConfiguration.conditionLabel}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {decisionConfiguration.providerId} · {decisionConfiguration.executionMode}
                  {decisionState.automationPaused ? " · paused" : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    decisionState.automationPaused
                      ? onResumeAutomation()
                      : onPauseAutomation()
                  }
                >
                  {decisionState.automationPaused ? "Resume automation" : "Pause automation"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    onExecutionModeChange(
                      decisionConfiguration.executionMode === "autonomous"
                        ? "advisory"
                        : "autonomous"
                    )
                  }
                >
                  {decisionConfiguration.executionMode === "autonomous" ? "Advisory" : "Autonomous"}
                </Button>
              </div>

              {decisionState.activeProposal ? (
                <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                  <p className="text-sm font-medium">Active proposal</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {decisionState.activeProposal.rationale}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={() => onApproveProposal(decisionState.activeProposal!.proposalId)}>
                      Approve proposal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRejectProposal(decisionState.activeProposal!.proposalId)}
                    >
                      Reject proposal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.1rem] border border-dashed bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  No active proposal. Manual intervention remains available below.
                </div>
              )}

              <FollowParticipantRow
                checked={followParticipant}
                onCheckedChange={onFollowParticipantChange}
              />

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <MetricItem
                  label="Current word"
                  value={activeWord ?? "No fixation"}
                  className="col-span-2"
                />
                <MetricItem label="Sample rate" value={`${sampleRateHz} Hz`} />
                <MetricItem label="Validity" value={formatPercent(validityRate)} />
                <MetricItem label="Latency" value={<LatencyValue latencyMs={latencyMs} />} />
                <MetricItem label="Participant" value={participantName ?? "Not registered"} />
                <MetricItem label="Heat map" value={readingDynamicsEnabled ? "Live" : "Off"} />
                <MetricItem
                  label="Current dwell"
                  value={
                    readingDynamicsEnabled ? formatDurationMs(currentFixationDurationMs) : "Off"
                  }
                />
                <MetricItem
                  label="Fixated"
                  value={readingDynamicsEnabled ? fixatedTokenCount : "-"}
                />
                <MetricItem
                  label="Skimmed"
                  value={readingDynamicsEnabled ? skimmedTokenCount : "-"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <SectionLabel>Presentation</SectionLabel>

              <Field>
                <FieldLabel>Font family</FieldLabel>
                <Select
                  value={normalizeFontTheme(presentation.fontFamily)}
                  onValueChange={(value) =>
                    onCommitIntervention(
                      { presentation: { fontFamily: value as FontTheme } },
                      `Changed font family to ${PRESENTATION_FONT_LABELS[value as FontTheme]}`
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {PRESENTATION_FONT_LABELS[font]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex items-center justify-between rounded-[1.1rem] border bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Lock participant editing</p>
                </div>
                <Switch
                  checked={!presentation.editableByExperimenter}
                  onCheckedChange={(checked) =>
                    onCommitIntervention(
                      { presentation: { editableByExperimenter: !checked } },
                      checked
                        ? "Locked participant-side presentation changes"
                        : "Unlocked participant-side presentation changes"
                    )
                  }
                />
              </div>

              <Field>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>Font size</FieldLabel>
                  <span className="text-xs text-muted-foreground">{presentation.fontSizePx}px</span>
                </div>
                <Slider
                  min={14}
                  max={28}
                  step={2}
                  value={[presentation.fontSizePx]}
                  onValueChange={(value) =>
                    onCommitIntervention(
                      { presentation: { fontSizePx: value[0] ?? presentation.fontSizePx } },
                      "Adjusted font size"
                    )
                  }
                />
              </Field>

              <Field>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <FieldLabel>Theme mode</FieldLabel>
                  <ModeToggle
                    className="shrink-0"
                    value={appearance.themeMode}
                    onValueChange={(value) =>
                      onReaderAppearanceChange(
                        { themeMode: value },
                        value === "dark" ? "Switched reader theme to dark mode" : "Switched reader theme to light mode"
                      )
                    }
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel>Color palette</FieldLabel>
                <div className="mt-2">
                  <ThemePalette
                    value={appearance.palette}
                    onValueChange={(value) =>
                      onReaderAppearanceChange(
                        { palette: value },
                        `Changed reader palette to ${value.replace("-", " ")}`
                      )
                    }
                  />
                </div>
              </Field>

              <Field>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>Line width</FieldLabel>
                  <span className="text-xs text-muted-foreground">{presentation.lineWidthPx}px</span>
                </div>
                <Slider
                  min={520}
                  max={920}
                  step={20}
                  value={[presentation.lineWidthPx]}
                  onValueChange={(value) =>
                    onCommitIntervention(
                      { presentation: { lineWidthPx: value[0] ?? presentation.lineWidthPx } },
                      "Adjusted line width"
                    )
                  }
                />
              </Field>

              <Field>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>Line height</FieldLabel>
                  <span className="text-xs text-muted-foreground">{presentation.lineHeight.toFixed(2)}</span>
                </div>
                <Slider
                  min={1.2}
                  max={2.2}
                  step={0.05}
                  value={[presentation.lineHeight]}
                  onValueChange={(value) =>
                    onCommitIntervention(
                      { presentation: { lineHeight: value[0] ?? presentation.lineHeight } },
                      "Adjusted line height"
                    )
                  }
                />
              </Field>

              <Field>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel>Letter spacing</FieldLabel>
                  <span className="text-xs text-muted-foreground">
                    {presentation.letterSpacingEm.toFixed(2)}em
                  </span>
                </div>
                <Slider
                  min={0}
                  max={0.12}
                  step={0.01}
                  value={[presentation.letterSpacingEm]}
                  onValueChange={(value) =>
                    onCommitIntervention(
                      { presentation: { letterSpacingEm: value[0] ?? presentation.letterSpacingEm } },
                      "Adjusted letter spacing"
                    )
                  }
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>ReaderShell controls</SectionLabel>
                <p className="mt-2 text-sm font-medium">Press V to open</p>
              </div>
              <KbdGroup className="text-muted-foreground">
                <Kbd>V</Kbd>
                <span className="text-[10px] uppercase tracking-[0.18em]">open</span>
                <Kbd>Esc</Kbd>
                <span className="text-[10px] uppercase tracking-[0.18em]">hide</span>
              </KbdGroup>
            </div>
          </CardContent>
        </Card>

        <SheetContent side="left" className="w-[22rem] sm:max-w-[22rem]">
          <SheetHeader className="border-b">
            <SheetTitle>Reader view controls</SheetTitle>
            <SheetDescription>Press Esc to close.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <ControlSection title="Context">
                <ControlRow
                  label="Preserve context"
                  description="Keep the reading position anchored when presentation changes."
                  checked={readerOptions.preserveContextOnIntervention}
                  onCheckedChange={(checked) => onReaderOptionChange("preserveContextOnIntervention", checked)}
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
                  description="Color tokens by accumulated fixation time and mark brief skims directly in the mirrored text."
                  checked={readingDynamicsEnabled}
                  onCheckedChange={(checked) =>
                    onReaderOptionChange("showFixationHeatmap", checked)
                  }
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
                  onCheckedChange={(checked) => onReaderOptionChange("highlightTokensBeingLookedAt", checked)}
                />
                <ControlRow
                  label="Show LIX scores"
                  description="Display readability badges inside the mirrored page."
                  checked={readerOptions.showLixScores}
                  onCheckedChange={(checked) => onReaderOptionChange("showLixScores", checked)}
                />
                {readingDynamicsEnabled ? (
                  <div className="rounded-[1.1rem] border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-5 text-amber-900">
                    Light amber means a shorter fixation. Darker orange means a longer fixation. Blue underlines mark
                    quick passes that were likely skimmed.
                  </div>
                ) : null}
              </ControlSection>

              <ControlSection title="Reader chrome">
                <ControlRow
                  label="Show toolbar"
                  description="Reveal the reader toolbar in the mirrored page."
                  checked={readerOptions.showToolbar}
                  onCheckedChange={(checked) => onReaderOptionChange("showToolbar", checked)}
                />
                <ControlRow
                  label="Show back button"
                  description="Only applies while the mirrored toolbar is visible."
                  checked={readerOptions.showBackButton}
                  disabled={!readerOptions.showToolbar}
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
