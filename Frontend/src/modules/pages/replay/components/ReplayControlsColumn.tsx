"use client"

import { useEffect, useState, type ChangeEventHandler, type ReactNode } from "react"
import { Pause, Play, RotateCcw, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { formatReplayClock } from "@/lib/experiment-replay"
import { cn } from "@/lib/utils"
import { PLAYBACK_SPEEDS, type ReplayPlaybackSpeed, type ReplayReaderOptions } from "@/modules/pages/replay/types"

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
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

type ReplayControlsColumnProps = {
  inputId: string
  currentTimeMs: number
  durationMs: number
  isPlaying: boolean
  playbackSpeed: ReplayPlaybackSpeed
  readerOptions: ReplayReaderOptions
  onTimeChange: (timeMs: number) => void
  onTogglePlayback: () => void
  onRestart: () => void
  onPlaybackSpeedChange: (speed: ReplayPlaybackSpeed) => void
  onInputChange: ChangeEventHandler<HTMLInputElement>
  onClear: () => void
  onReaderOptionChange: (key: keyof ReplayReaderOptions, value: boolean) => void
}

export function ReplayControlsColumn({
  inputId,
  currentTimeMs,
  durationMs,
  isPlaying,
  playbackSpeed,
  readerOptions,
  onTimeChange,
  onTogglePlayback,
  onRestart,
  onPlaybackSpeedChange,
  onInputChange,
  onClear,
  onReaderOptionChange,
}: ReplayControlsColumnProps) {
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
      <div className="order-2 flex min-h-0 min-w-0 max-w-full flex-col gap-4 overflow-x-hidden overflow-y-auto xl:order-1">
        <Card className="min-w-0 max-w-full rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="min-w-0 space-y-4 overflow-x-hidden pt-6">
            <div className="rounded-[1.2rem] border bg-muted/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Playback</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatReplayClock(currentTimeMs)}
                <span className="text-base font-medium text-muted-foreground">
                  {" "}
                  / {formatReplayClock(durationMs)}
                </span>
              </p>
            </div>

            <Slider
              min={0}
              max={Math.max(durationMs, 1)}
              step={10}
              value={[currentTimeMs]}
              onValueChange={(value) => onTimeChange(value[0] ?? 0)}
            />

            <div className="min-w-0 flex gap-2">
              <Button type="button" className="min-w-0 shrink flex-1" onClick={onTogglePlayback}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={onRestart}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <ButtonGroup className="w-full min-w-0 overflow-hidden">
              {PLAYBACK_SPEEDS.map((speed) => (
                <Button
                  key={speed}
                  type="button"
                  variant={playbackSpeed === speed ? "default" : "outline"}
                  className="min-w-0 shrink flex-1"
                  onClick={() => onPlaybackSpeedChange(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </ButtonGroup>

            <div className="min-w-0 flex gap-2">
              <label htmlFor={inputId} className="min-w-0 flex-1">
                <Input
                  id={inputId}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={onInputChange}
                />
                <Button type="button" variant="outline" asChild className="w-full min-w-0 shrink">
                  <span className="min-w-0">
                    <Upload className="h-4 w-4" />
                    Replace
                  </span>
                </Button>
              </label>
              <Button type="button" variant="outline" className="min-w-0 shrink" onClick={onClear}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 max-w-full rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="min-w-0 overflow-x-hidden pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>ReaderShell controls</SectionLabel>
                <p className="mt-2 text-sm font-medium">Press V to open</p>
              </div>
              <KbdGroup className="min-w-0 shrink-0 overflow-hidden text-muted-foreground">
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
                  label="Preserve context on intervention"
                  description="Keep the reading position anchored when the presentation changes."
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
                  label="Display gaze position"
                  description="Show the replay gaze marker on the page."
                  checked={readerOptions.displayGazePosition}
                  onCheckedChange={(checked) => onReaderOptionChange("displayGazePosition", checked)}
                />
                <ControlRow
                  label="Highlight focused token"
                  description="Highlight the token the participant was focused on."
                  checked={readerOptions.highlightTokensBeingLookedAt}
                  onCheckedChange={(checked) => onReaderOptionChange("highlightTokensBeingLookedAt", checked)}
                />
                <ControlRow
                  label="Show LIX scores"
                  description="Display readability badges inside the reading view."
                  checked={readerOptions.showLixScores}
                  onCheckedChange={(checked) => onReaderOptionChange("showLixScores", checked)}
                />
              </ControlSection>

              <ControlSection title="Reader chrome">
                <ControlRow
                  label="Show toolbar"
                  description="Reveal the reader toolbar during replay."
                  checked={readerOptions.showToolbar}
                  onCheckedChange={(checked) => onReaderOptionChange("showToolbar", checked)}
                />
                <ControlRow
                  label="Show back button"
                  description="Only applies when the replay toolbar is visible."
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
