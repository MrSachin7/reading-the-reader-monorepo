"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { type ConnectionStats, subscribeToConnectionStats, subscribeToGaze } from "@/lib/gaze-socket"
import { calculateGazePoint, normalizeGazePoint, type GazePoint } from "./gaze-helpers"

type GazeStreamOptions = {
  enabled?: boolean
}

type UseGazeConnectionStatsResult = {
  connectionStats: ConnectionStats | null
  sampleRateHz: number
  hasRecentGaze: boolean
}

const RECENT_GAZE_WINDOW_MS = 700

/**
 * Low-frequency gaze connection/quality stats. Safe to call from heavy pages:
 * it re-renders the host at roughly 1 Hz (sample rate), on liveness transitions,
 * and on connection-stat changes — never per animation frame. The high-frequency
 * gaze point is deliberately NOT exposed here; use {@link useGazeMarker} for that.
 */
export function useGazeConnectionStats(
  options: GazeStreamOptions = {}
): UseGazeConnectionStatsResult {
  const enabled = options.enabled ?? true
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null)
  const [sampleRateHz, setSampleRateHz] = useState(0)
  const [hasRecentGaze, setHasRecentGaze] = useState(false)

  const sampleCounterRef = useRef(0)
  const lastValidPointAtRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      sampleCounterRef.current = 0
      lastValidPointAtRef.current = 0
      setConnectionStats(null)
      setSampleRateHz(0)
      setHasRecentGaze(false)
      return
    }

    const unsubscribeGaze = subscribeToGaze((sample) => {
      sampleCounterRef.current += 1
      if (calculateGazePoint(sample)) {
        lastValidPointAtRef.current = Date.now()
      }
    })

    const unsubscribeStats = subscribeToConnectionStats((stats) => {
      setConnectionStats(stats)
    })

    const sampleRateTimer = window.setInterval(() => {
      setSampleRateHz(sampleCounterRef.current)
      sampleCounterRef.current = 0
    }, 1000)

    const livenessTimer = window.setInterval(() => {
      setHasRecentGaze(Date.now() - lastValidPointAtRef.current < RECENT_GAZE_WINDOW_MS)
    }, 250)

    return () => {
      unsubscribeGaze()
      unsubscribeStats()
      window.clearInterval(sampleRateTimer)
      window.clearInterval(livenessTimer)
    }
  }, [enabled])

  if (!enabled) {
    return { connectionStats: null, sampleRateHz: 0, hasRecentGaze: false }
  }

  return { connectionStats, sampleRateHz, hasRecentGaze }
}

type UseGazeMarkerOptions = GazeStreamOptions & {
  hideWhenNoPoint?: boolean
}

/**
 * Imperatively drives a gaze marker element. Subscribes to the gaze stream and
 * writes `transform`/`opacity` directly to the element inside a single
 * requestAnimationFrame loop — ZERO React state per frame, so the host component
 * never re-renders on gaze movement. This is what keeps the live view smooth.
 */
export function useGazeMarker(
  markerRef: RefObject<HTMLElement | null>,
  options: UseGazeMarkerOptions = {}
): void {
  const enabled = options.enabled ?? true
  const hideWhenNoPoint = options.hideWhenNoPoint ?? false

  useEffect(() => {
    const marker = markerRef.current
    const idleOpacity = hideWhenNoPoint ? "0" : "0.2"

    if (!enabled) {
      if (marker) {
        marker.style.opacity = idleOpacity
      }
      return
    }

    let smoothedPoint: GazePoint | null = null
    let lastValidPointAt = 0
    let frameId = 0

    const unsubscribe = subscribeToGaze((sample) => {
      const nextPoint = calculateGazePoint(sample)
      if (!nextPoint) {
        return
      }
      lastValidPointAt = Date.now()
      smoothedPoint = normalizeGazePoint(smoothedPoint, nextPoint)
    })

    const render = () => {
      const node = markerRef.current
      if (node) {
        const hasRecentGaze = Date.now() - lastValidPointAt < RECENT_GAZE_WINDOW_MS
        if (smoothedPoint && hasRecentGaze) {
          node.style.opacity = "1"
          node.style.transform = `translate(-50%, -50%) translate(${smoothedPoint.x * 100}vw, ${smoothedPoint.y * 100}vh)`
        } else {
          node.style.opacity = idleOpacity
        }
      }
      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      unsubscribe()
      window.cancelAnimationFrame(frameId)
    }
  }, [enabled, hideWhenNoPoint, markerRef])
}
