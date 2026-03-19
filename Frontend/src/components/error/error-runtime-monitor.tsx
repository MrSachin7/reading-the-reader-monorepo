"use client"

import * as React from "react"

import { reportAppError } from "@/redux/error-reporter"

export function ErrorRuntimeMonitor() {
  React.useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      reportAppError(event.error ?? event.message, {
        title: "Runtime error",
        source: "runtime",
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportAppError(event.reason, {
        title: "Unhandled promise rejection",
        source: "runtime",
      })
    }

    window.addEventListener("error", handleWindowError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleWindowError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
