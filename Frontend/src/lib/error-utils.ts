import type { SerializedError } from "@reduxjs/toolkit"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query"

export type ErrorSource = "api" | "runtime" | "websocket" | "validation"
export type ErrorSeverity = "error" | "warning"

export type AppErrorRecord = {
  id: string
  title: string
  message: string
  source: ErrorSource
  severity: ErrorSeverity
  timestamp: number
  statusCode: number | null
  details: string | null
  fingerprint: string
}

export type AppErrorInput = {
  title?: string
  message?: string
  source?: ErrorSource
  severity?: ErrorSeverity
  statusCode?: number | null
  details?: string | null
}

type ErrorLikeRecord = {
  data?: unknown
  message?: string
  status?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractStringList(value: unknown) {
  if (!isObject(value)) {
    return []
  }

  return Object.values(value).flatMap((entry) =>
    Array.isArray(entry) ? entry.filter((item): item is string => typeof item === "string") : []
  )
}

function buildDetails(error: unknown) {
  if (typeof error === "string") {
    return error
  }

  if (error instanceof Error) {
    return error.stack ?? error.message
  }

  if (isObject(error)) {
    try {
      return JSON.stringify(error, null, 2)
    } catch {
      return null
    }
  }

  return null
}

function normalizeStatus(status: unknown) {
  return typeof status === "number" ? status : null
}

function extractMessageFromData(data: unknown) {
  if (!isObject(data)) {
    return null
  }

  const validationErrors = extractStringList(data.errors)
  if (validationErrors.length > 0) {
    return validationErrors[0]
  }

  if (typeof data.message === "string" && data.message.trim().length > 0) {
    return data.message
  }

  if (typeof data.title === "string" && data.title.trim().length > 0) {
    return data.title
  }

  return null
}

export function getErrorStatus(error: unknown) {
  if (!isObject(error) || !("status" in error)) {
    return null
  }

  return normalizeStatus(error.status)
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (typeof error === "string" && error.trim().length > 0) {
    return error
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (!isObject(error)) {
    return fallback
  }

  const errorRecord = error as ErrorLikeRecord
  const messageFromData = extractMessageFromData(errorRecord.data)
  if (messageFromData) {
    return messageFromData
  }

  if (typeof errorRecord.message === "string" && errorRecord.message.trim().length > 0) {
    return errorRecord.message
  }

  return fallback
}

export function normalizeAppError(
  error: unknown,
  {
    title = "Something went wrong",
    message,
    source = "runtime",
    severity = "error",
    statusCode,
    details,
  }: AppErrorInput = {}
): AppErrorRecord {
  const normalizedMessage = message ?? getErrorMessage(error, "An unexpected error occurred.")
  const normalizedStatus = statusCode ?? getErrorStatus(error)
  const normalizedDetails = details ?? buildDetails(error)
  const timestamp = Date.now()
  const fingerprint = [source, normalizedStatus ?? "na", title, normalizedMessage].join("|")

  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message: normalizedMessage,
    source,
    severity,
    timestamp,
    statusCode: normalizedStatus,
    details: normalizedDetails,
    fingerprint,
  }
}

export function normalizeApiError(
  error: FetchBaseQueryError | SerializedError | unknown,
  title = "Request failed"
) {
  return normalizeAppError(error, {
    title,
    source: "api",
    message: getErrorMessage(error, "The request could not be completed."),
    statusCode: getErrorStatus(error),
  })
}
