"use client"

import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import type { ReplayQuizFrame } from "@/lib/experiment-replay"
import type { GazeData } from "@/lib/gaze-socket"
import { cn } from "@/lib/utils"

type Props = {
  quiz: ReplayQuizFrame
  gaze: GazeData | null
}

function averageNormalizedGaze(gaze: GazeData): { x: number; y: number } | null {
  const leftValid = gaze.leftEyeValidity === "Valid" || gaze.leftEyeValidity === "valid"
  const rightValid = gaze.rightEyeValidity === "Valid" || gaze.rightEyeValidity === "valid"

  let x: number | null = null
  let y: number | null = null
  if (leftValid && rightValid) {
    x = (gaze.leftEyeX + gaze.rightEyeX) / 2
    y = (gaze.leftEyeY + gaze.rightEyeY) / 2
  } else if (leftValid) {
    x = gaze.leftEyeX
    y = gaze.leftEyeY
  } else if (rightValid) {
    x = gaze.rightEyeX
    y = gaze.rightEyeY
  } else {
    return null
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return { x, y }
}

export function ReplayQuizPanel({ quiz, gaze }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [container, setContainer] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 })

  React.useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }

    const update = () => {
      const rect = node.getBoundingClientRect()
      setContainer({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const viewportWidth = quiz.layout ? Math.max(...quiz.layout.optionBboxes.map((o) => o.x + o.width), quiz.layout.promptX + quiz.layout.promptWidth, window.innerWidth) : window.innerWidth
  const viewportHeight = window.innerHeight

  // We scale recorded viewport bboxes into the available container so the same proportions are preserved.
  const scaleX = container.width > 0 ? container.width / viewportWidth : 1
  const scaleY = container.height > 0 ? container.height / viewportHeight : 1
  const scale = Math.min(scaleX, scaleY) || 1

  const normalizedGaze = gaze ? averageNormalizedGaze(gaze) : null
  // Gaze is normalized 0-1 of the original screen. We approximate by scaling against the
  // recorded viewport space (innerWidth/innerHeight at recording time).
  const gazeOverlayX = normalizedGaze ? normalizedGaze.x * viewportWidth * scale : null
  const gazeOverlayY = normalizedGaze ? normalizedGaze.y * viewportHeight * scale : null

  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        {!quiz.layout ? (
          <div className="flex h-full items-center justify-center p-6">
            <Alert>
              <AlertTitle>Quiz layout not recorded</AlertTitle>
              <AlertDescription>
                A quiz is active at this point in the replay, but no recorded layout is available. The participant is on
                {quiz.questionIndex !== null
                  ? ` question ${quiz.questionIndex + 1}${quiz.questionCount ? ` of ${quiz.questionCount}` : ""}.`
                  : " the quiz."}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Quiz</Badge>
                {quiz.questionIndex !== null ? (
                  <span className="text-sm font-medium">
                    Question {quiz.questionIndex + 1}
                    {quiz.questionCount ? ` of ${quiz.questionCount}` : null}
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {quiz.activeRegionType === "outside"
                  ? "Looking outside"
                  : quiz.activeRegionType === "prompt"
                    ? "Looking at prompt"
                    : quiz.activeRegionType === "option"
                      ? `Looking at option`
                      : "—"}
              </span>
            </div>
            <div ref={containerRef} className="relative flex-1 overflow-hidden bg-background/40">
              <div
                className="absolute rounded-md border border-primary/30 bg-primary/5 p-3 text-sm leading-snug"
                style={{
                  left: quiz.layout.promptX * scale,
                  top: quiz.layout.promptY * scale,
                  width: quiz.layout.promptWidth * scale,
                  minHeight: quiz.layout.promptHeight * scale,
                }}
              >
                {quiz.prompt ?? "(prompt not recorded)"}
              </div>

              {quiz.layout.optionBboxes.map((option) => {
                const isSelected = option.optionId === quiz.selectedOptionId
                const isFocused =
                  quiz.activeRegionType === "option" && quiz.activeOptionId === option.optionId
                return (
                  <div
                    key={option.optionId}
                    className={cn(
                      "absolute flex items-center rounded-md border px-3 text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary/15 text-primary-foreground"
                        : "border-border bg-card",
                      isFocused ? "ring-2 ring-amber-400" : null
                    )}
                    style={{
                      left: option.x * scale,
                      top: option.y * scale,
                      width: option.width * scale,
                      height: option.height * scale,
                    }}
                  >
                    <span className="truncate">{option.optionId}</span>
                  </div>
                )
              })}

              {gazeOverlayX !== null && gazeOverlayY !== null ? (
                <div
                  className="pointer-events-none absolute -ml-3 -mt-3 h-6 w-6 rounded-full border-2 border-fuchsia-500 bg-fuchsia-500/30"
                  style={{ left: gazeOverlayX, top: gazeOverlayY }}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
