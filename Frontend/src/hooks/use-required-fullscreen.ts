"use client"

import { useCallback, useEffect, useState } from "react"

type UseRequiredFullscreenOptions = {
  autoRequest?: boolean
}

function supportsFullscreen() {
  return typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function"
}

export function useRequiredFullscreen({
  autoRequest = false,
}: UseRequiredFullscreenOptions = {}) {
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false
  )
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  )
  const [requestWasRejected, setRequestWasRejected] = useState(false)

  const requestFullscreen = useCallback(async () => {
    if (!supportsFullscreen()) {
      return false
    }

    if (document.fullscreenElement) {
      setIsFullscreen(true)
      setRequestWasRejected(false)
      return true
    }

    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      setRequestWasRejected(false)
      return true
    } catch {
      setRequestWasRejected(true)
      return false
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible")
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!autoRequest) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      void requestFullscreen()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [autoRequest, requestFullscreen])

  return {
    isSupported: supportsFullscreen(),
    isFullscreen,
    isVisible,
    requestWasRejected,
    requestFullscreen,
  }
}
