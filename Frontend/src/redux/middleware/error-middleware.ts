import {
  isRejected,
  isRejectedWithValue,
  type Middleware,
  type UnknownAction,
} from "@reduxjs/toolkit"

import { normalizeApiError } from "@/lib/error-utils"
import { pushError } from "@/redux/slices/app-slice"

function hasMetaBaseQuery(action: UnknownAction) {
  return typeof action === "object" && action !== null && "meta" in action
}

function buildErrorTitle(action: UnknownAction) {
  if (!hasMetaBaseQuery(action)) {
    return "Request failed"
  }

  const meta = action.meta as { arg?: { endpointName?: string; type?: string } }
  const endpoint = meta.arg?.endpointName
  const requestType = meta.arg?.type === "query" ? "Load failed" : "Action failed"

  if (!endpoint) {
    return requestType
  }

  const label = endpoint
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase())

  return `${requestType}: ${label}`
}

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const normalizedError = normalizeApiError(
      action.payload,
      buildErrorTitle(action)
    )

    next(pushError(normalizedError))
  }

  if (isRejected(action)) {
    const normalizedError = normalizeApiError(action.error, buildErrorTitle(action))

    next(pushError(normalizedError))
  }

  return next(action)
}
