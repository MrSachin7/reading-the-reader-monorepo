"use client"

import { useEffect, type ReactNode } from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  readerOptions: LiveReaderOptions
  onReaderOptionChange: (key: keyof LiveReaderOptions, value: boolean) => void
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

export function LiveReaderControlsSheet({
  open,
  onOpenChange,
  readerOptions,
  onReaderOptionChange,
}: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() === "v") {
        if (!open && isInteractiveTarget(event.target)) {
          return
        }

        event.preventDefault()
        onOpenChange(!open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[22rem] sm:max-w-[22rem]">
        <SheetHeader className="border-b">
          <SheetTitle>Reader view controls</SheetTitle>
          <SheetDescription>
            <KbdGroup className="text-muted-foreground">
              <Kbd>V</Kbd>
              <span className="text-[10px] uppercase tracking-[0.18em]">toggle</span>
              <Kbd>Esc</Kbd>
              <span className="text-[10px] uppercase tracking-[0.18em]">close</span>
            </KbdGroup>
          </SheetDescription>
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

            <ControlSection title="Gaze and attention">
              <ControlRow
                label="Display gaze marker"
                description="Render the live gaze marker on top of the mirror."
                checked={readerOptions.displayGazePosition}
                onCheckedChange={(checked) => onReaderOptionChange("displayGazePosition", checked)}
              />
              <ControlRow
                label="Highlight focused token"
                description="Highlight the token the participant is currently looking at."
                checked={readerOptions.highlightTokensBeingLookedAt}
                onCheckedChange={(checked) => onReaderOptionChange("highlightTokensBeingLookedAt", checked)}
              />
              <ControlRow
                label="Show fixation heat map"
                description="Color tokens by accumulated fixation time and skim activity."
                checked={readerOptions.showFixationHeatmap}
                onCheckedChange={(checked) => onReaderOptionChange("showFixationHeatmap", checked)}
              />
              <ControlRow
                label="Show LIX scores"
                description="Display readability badges inside the reader."
                checked={readerOptions.showLixScores}
                onCheckedChange={(checked) => onReaderOptionChange("showLixScores", checked)}
              />
            </ControlSection>

            <ControlSection title="Reader chrome">
              <ControlRow
                label="Show toolbar"
                description="Reveal the reader toolbar."
                checked={readerOptions.showToolbar}
                onCheckedChange={(checked) => onReaderOptionChange("showToolbar", checked)}
              />
              <ControlRow
                label="Show back button"
                description="Only applies when the toolbar is visible."
                checked={readerOptions.showBackButton}
                disabled={!readerOptions.showToolbar}
                onCheckedChange={(checked) => onReaderOptionChange("showBackButton", checked)}
              />
            </ControlSection>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
