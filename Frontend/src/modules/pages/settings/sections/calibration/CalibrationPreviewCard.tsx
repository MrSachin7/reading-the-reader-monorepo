"use client"

import type { CalibrationPointDefinition } from "@/lib/calibration"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalibrationPointPreview } from "@/modules/pages/settings/sections/calibration/CalibrationPointPreview"

export function CalibrationPreviewCard({
  previewPoints,
  previewPattern,
  showSavedDifferenceHint,
}: {
  previewPoints: CalibrationPointDefinition[]
  previewPattern: string
  showSavedDifferenceHint: boolean
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          Preview updates immediately when you change the draft preset, before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CalibrationPointPreview points={previewPoints} />
        <div className="rounded-[1.25rem] border bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview pattern</p>
          <p className="mt-2 text-lg font-semibold">{previewPattern}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {previewPoints.length} points are included in this preset.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
