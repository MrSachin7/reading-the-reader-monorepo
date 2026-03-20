"use client"

import { CheckCircle2, RotateCcw, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CalibrationPresetCard({
  draftPreset,
  supportedPointCounts,
  presetDescription,
  savedPresetCount,
  isDirty,
  isLoading,
  isSaving,
  isCalibrationRunning,
  statusMessage,
  errorMessage,
  onDraftPresetChange,
  onSave,
  onReset,
}: {
  draftPreset: string
  supportedPointCounts: number[]
  presetDescription: string
  savedPresetCount: number | null | undefined
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  isCalibrationRunning: boolean
  statusMessage: string | null
  errorMessage: string | null
  onDraftPresetChange: (value: string) => void
  onSave: () => void
  onReset: () => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Preset</CardTitle>
        <CardDescription>
          Changes apply to the next calibration session. Editing is blocked while a calibration run is active.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-3">
          <label className="text-sm font-medium">Calibration points</label>
          <Select
            value={draftPreset}
            onValueChange={onDraftPresetChange}
            disabled={isLoading || isSaving || isCalibrationRunning}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose a preset" />
            </SelectTrigger>
            <SelectContent>
              {supportedPointCounts.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} points
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm leading-6 text-muted-foreground">{presetDescription}</p>
          {savedPresetCount !== null && savedPresetCount !== undefined ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Saved: {savedPresetCount} points
              </span>
              {isDirty ? (
                <span className="rounded-full border bg-background px-3 py-1 text-xs text-foreground">
                  Unsaved change
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving || !draftPreset || isCalibrationRunning}
          >
            <Save className="h-4 w-4" />
            Save preset
          </Button>
          <Button variant="outline" onClick={onReset} disabled={!isDirty || isSaving}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {statusMessage ? (
          <div className="rounded-xl border bg-muted px-4 py-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p>{statusMessage}</p>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isCalibrationRunning ? (
          <div className="rounded-xl border bg-muted px-4 py-3 text-sm text-foreground">
            A calibration run is active. Wait until it finishes or cancel it before changing the preset.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
