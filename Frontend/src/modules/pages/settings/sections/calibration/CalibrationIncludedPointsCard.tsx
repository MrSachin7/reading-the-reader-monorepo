"use client"

import { CircleDot } from "lucide-react"

import type { CalibrationPointDefinition } from "@/lib/calibration"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CalibrationIncludedPointsCard({
  previewPoints,
}: {
  previewPoints: CalibrationPointDefinition[]
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Included Points</CardTitle>
        <CardDescription>
          Use this to verify which anchors belong to the current draft preset before saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {previewPoints.map((point) => (
            <div key={point.pointId} className="rounded-[1.25rem] border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{point.label}</p>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{point.pointId}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                x={point.x.toFixed(2)} y={point.y.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
