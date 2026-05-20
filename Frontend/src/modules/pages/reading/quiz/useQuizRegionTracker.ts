"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import type {
  ComprehensionOption,
  QuizFocusRegionType,
  QuizOptionBbox,
  QuizQuestionLayout,
} from "@/lib/comprehension-quiz"
import {
  sendQuizFocusEvent,
  sendQuizLifecycleEvent,
  subscribeToGaze,
  type GazeData,
} from "@/lib/gaze-socket"

type ActiveRegion = {
  type: QuizFocusRegionType
  optionId: string | null
}

type Params = {
  materialItemId: string
  questionId: string
  questionIndex: number
  totalQuestions: number
  prompt: string
  options: ComprehensionOption[]
}

const OUTSIDE_REGION: ActiveRegion = { type: "outside", optionId: null }
const NONE_REGION: ActiveRegion = { type: "none", optionId: null }

function rectToBbox(rect: DOMRect) {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function isInsideRect(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function regionsEqual(left: ActiveRegion, right: ActiveRegion) {
  return left.type === right.type && left.optionId === right.optionId
}

function averageGazeViewport(gaze: GazeData): { x: number; y: number } | null {
  const leftValid = gaze.leftEyeValidity === "Valid" || gaze.leftEyeValidity === "valid"
  const rightValid = gaze.rightEyeValidity === "Valid" || gaze.rightEyeValidity === "valid"

  let normalizedX: number | null = null
  let normalizedY: number | null = null

  if (leftValid && rightValid) {
    normalizedX = (gaze.leftEyeX + gaze.rightEyeX) / 2
    normalizedY = (gaze.leftEyeY + gaze.rightEyeY) / 2
  } else if (leftValid) {
    normalizedX = gaze.leftEyeX
    normalizedY = gaze.leftEyeY
  } else if (rightValid) {
    normalizedX = gaze.rightEyeX
    normalizedY = gaze.rightEyeY
  } else {
    return null
  }

  if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
    return null
  }

  return {
    x: normalizedX * window.innerWidth,
    y: normalizedY * window.innerHeight,
  }
}

export function useQuizRegionTracker({
  materialItemId,
  questionId,
  questionIndex,
  totalQuestions,
  prompt,
  options,
}: Params) {
  const promptRef = useRef<HTMLElement | null>(null)
  const optionRefs = useRef(new Map<string, HTMLElement | null>())
  const activeRegionRef = useRef<ActiveRegion>(NONE_REGION)
  const startedRef = useRef(false)

  const setPromptRef = useCallback((node: HTMLElement | null) => {
    promptRef.current = node
  }, [])

  const setOptionRef = useCallback((optionId: string, node: HTMLElement | null) => {
    if (node === null) {
      optionRefs.current.delete(optionId)
    } else {
      optionRefs.current.set(optionId, node)
    }
  }, [])

  const captureLayout = useCallback((): QuizQuestionLayout | null => {
    const promptNode = promptRef.current
    if (!promptNode) {
      return null
    }

    const promptRect = promptNode.getBoundingClientRect()
    const optionBboxes: QuizOptionBbox[] = []
    for (const option of options) {
      const node = optionRefs.current.get(option.id)
      if (!node) {
        continue
      }
      const rect = node.getBoundingClientRect()
      optionBboxes.push({
        optionId: option.id,
        ...rectToBbox(rect),
        text: option.text,
      })
    }

    return {
      promptX: promptRect.left,
      promptY: promptRect.top,
      promptWidth: promptRect.width,
      promptHeight: promptRect.height,
      optionBboxes,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  }, [options])

  // Emit quiz-started exactly once per quiz session
  useEffect(() => {
    if (startedRef.current) {
      return
    }
    startedRef.current = true
    sendQuizLifecycleEvent({
      materialItemId,
      eventType: "quiz-started",
      occurredAtUnixMs: Date.now(),
      questionCount: totalQuestions,
    })
  }, [materialItemId, totalQuestions])

  // Emit quiz-question-shown when the question is mounted or its layout changes (resize)
  useEffect(() => {
    const emitShown = () => {
      // Wait one frame so the DOM is laid out before measuring
      const layout = captureLayout()
      if (!layout) {
        return
      }
      sendQuizLifecycleEvent({
        materialItemId,
        eventType: "quiz-question-shown",
        occurredAtUnixMs: Date.now(),
        questionId,
        questionIndex,
        prompt,
        layout,
      })
    }

    const frameId = window.requestAnimationFrame(emitShown)
    window.addEventListener("resize", emitShown)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("resize", emitShown)
    }
  }, [captureLayout, materialItemId, prompt, questionId, questionIndex])

  // Reset active region when the active question changes
  useEffect(() => {
    activeRegionRef.current = NONE_REGION
  }, [questionId])

  // Subscribe to gaze and emit focus events on region transitions
  useEffect(() => {
    const unsubscribe = subscribeToGaze((gaze) => {
      const point = averageGazeViewport(gaze)
      if (!point) {
        return
      }

      let nextRegion: ActiveRegion = OUTSIDE_REGION

      const promptNode = promptRef.current
      if (promptNode && isInsideRect(promptNode.getBoundingClientRect(), point.x, point.y)) {
        nextRegion = { type: "prompt", optionId: null }
      } else {
        for (const option of options) {
          const node = optionRefs.current.get(option.id)
          if (!node) {
            continue
          }
          if (isInsideRect(node.getBoundingClientRect(), point.x, point.y)) {
            nextRegion = { type: "option", optionId: option.id }
            break
          }
        }
      }

      if (regionsEqual(activeRegionRef.current, nextRegion)) {
        return
      }

      activeRegionRef.current = nextRegion
      sendQuizFocusEvent({
        materialItemId,
        questionId,
        activeRegionType: nextRegion.type,
        activeOptionId: nextRegion.optionId,
        occurredAtUnixMs: Date.now(),
      })
    })

    return unsubscribe
  }, [materialItemId, options, questionId])

  const refs = useMemo(
    () => ({
      setPromptRef,
      setOptionRef,
    }),
    [setPromptRef, setOptionRef]
  )

  return refs
}
