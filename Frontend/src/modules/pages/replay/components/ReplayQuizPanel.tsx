"use client"

import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import type { ReplayQuizFrame } from "@/lib/experiment-replay"
import type { ParticipantViewportSnapshot } from "@/lib/experiment-session"
import type { GazeData } from "@/lib/gaze-socket"
import { cn } from "@/lib/utils"

type Props = {
  quiz: ReplayQuizFrame
  gaze: GazeData | null
  participantViewport: ParticipantViewportSnapshot | null
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

function computeStageDimensions(
  quiz: ReplayQuizFrame,
  participantViewport: ParticipantViewportSnapshot | null
) {
  // Strongest signal: the viewport size captured at the same moment the bboxes were
  // measured. This is the only value guaranteed to share a coordinate space with the
  // recorded bboxes and the normalized gaze.
  const layoutViewportWidth = quiz.layout?.viewportWidth ?? null
  const layoutViewportHeight = quiz.layout?.viewportHeight ?? null
  if (
    layoutViewportWidth !== null &&
    layoutViewportHeight !== null &&
    layoutViewportWidth > 0 &&
    layoutViewportHeight > 0
  ) {
    return { width: layoutViewportWidth, height: layoutViewportHeight }
  }

  // Older recordings: the participant's reader viewport is usually close enough.
  if (participantViewport && participantViewport.viewportWidthPx > 0 && participantViewport.viewportHeightPx > 0) {
    return {
      width: participantViewport.viewportWidthPx,
      height: participantViewport.viewportHeightPx,
    }
  }

  // Last resort: stretch the bbox extent so at least the layout itself is visible.
  if (quiz.layout) {
    const maxX = Math.max(
      quiz.layout.promptX + quiz.layout.promptWidth,
      ...quiz.layout.optionBboxes.map((o) => o.x + o.width)
    )
    const maxY = Math.max(
      quiz.layout.promptY + quiz.layout.promptHeight,
      ...quiz.layout.optionBboxes.map((o) => o.y + o.height)
    )
    return { width: maxX + 24, height: maxY + 24 }
  }

  return { width: 1440, height: 900 }
}

export function ReplayQuizPanel({ quiz, gaze, participantViewport }: Props) {
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

  const stage = computeStageDimensions(quiz, participantViewport)
  // Fit-to-contain. Never upscale past 1:1 — the recorded layout looks best at native size.
  const scale =
    container.width > 0 && container.height > 0
      ? Math.min(container.width / stage.width, container.height / stage.height, 1)
      : 1

  const normalizedGaze = gaze ? averageNormalizedGaze(gaze) : null
  // Gaze is normalized 0–1 of the participant's screen (Tobii) or viewport (mouse).
  // Multiplying by the recorded viewport size keeps the dot aligned with the bboxes.
  const gazeStageX = normalizedGaze ? normalizedGaze.x * stage.width : null
  const gazeStageY = normalizedGaze ? normalizedGaze.y * stage.height : null

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
                      ? "Looking at option"
                      : "—"}
              </span>
            </div>

            <div ref={containerRef} className="relative flex-1 overflow-hidden bg-background/40">
              {/* The stage is the participant's recorded viewport. We render bboxes at their
                  original coordinates inside it and uniformly transform-scale the whole thing
                  to fit the panel. The translate keeps the scaled stage centered when the
                  panel's aspect ratio doesn't match the participant viewport's. */}
              <div
                style={{
                  position: "absolute",
                  left: Math.max(0, (container.width - stage.width * scale) / 2),
                  top: Math.max(0, (container.height - stage.height * scale) / 2),
                  width: stage.width,
                  height: stage.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  className="absolute rounded-md border border-primary/30 bg-primary/5 p-3 text-base leading-snug"
                  style={{
                    left: quiz.layout.promptX,
                    top: quiz.layout.promptY,
                    width: quiz.layout.promptWidth,
                    minHeight: quiz.layout.promptHeight,
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
                        "absolute flex items-center rounded-md border px-3 text-base transition-colors",
                        isSelected
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card",
                        isFocused ? "ring-2 ring-amber-400" : null
                      )}
                      style={{
                        left: option.x,
                        top: option.y,
                        width: option.width,
                        height: option.height,
                      }}
                    >
                      <span className="truncate">{option.text ?? option.optionId}</span>
                    </div>
                  )
                })}

                {gazeStageX !== null && gazeStageY !== null ? (
                  <div
                    className="pointer-events-none absolute rounded-full border-2 border-fuchsia-500 bg-fuchsia-500/30"
                    style={{
                      left: gazeStageX - 12,
                      top: gazeStageY - 12,
                      width: 24,
                      height: 24,
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
