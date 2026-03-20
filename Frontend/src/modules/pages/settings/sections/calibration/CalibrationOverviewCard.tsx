"use client"

import { SlidersHorizontal } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CalibrationOverviewCard({
  selectedPresetCount,
  savedPresetCount,
  previewPointCount,
}: {
  selectedPresetCount: number
  savedPresetCount: number | null | undefined
  previewPointCount: number
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="gap-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted text-foreground">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-2xl">Calibration Preset</CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">
              Choose the calibration point count for the next run.
            </CardDescription>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Draft preset</p>
            <p className="mt-2 text-lg font-semibold">{selectedPresetCount} points</p>
          </div>
          <div className="rounded-[1.25rem] border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saved preset</p>
            <p className="mt-2 text-lg font-semibold">{savedPresetCount ?? "-"}</p>
          </div>
          <div className="rounded-[1.25rem] border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview points</p>
            <p className="mt-2 text-lg font-semibold">{previewPointCount}</p>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
