import type { AppDispatch } from "@/redux/store"
import { pushError } from "@/redux/slices/app-slice"
import { normalizeAppError, type AppErrorInput } from "@/lib/error-utils"

let activeDispatch: AppDispatch | null = null

export function registerErrorReporter(dispatch: AppDispatch | null) {
  activeDispatch = dispatch
}

export function reportAppError(error: unknown, input?: AppErrorInput) {
  if (!activeDispatch) {
    return
  }

  activeDispatch(pushError(normalizeAppError(error, input)))
}
