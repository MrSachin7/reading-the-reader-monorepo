"use client"

import * as React from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

type AppErrorBoundaryProps = {
  children: React.ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.18),transparent_35%),linear-gradient(180deg,var(--background),color-mix(in_oklab,var(--background)_82%,var(--destructive)_18%))] px-6 py-10">
        <div className="w-full max-w-2xl rounded-[2rem] border border-destructive/25 bg-background/92 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
              <AlertTriangle className="size-7" />
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-destructive/80">
                Interface error
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                The application hit an unexpected problem.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                The error was captured and surfaced in the frontend. Reload the page to restore the
                session state.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={this.handleReload}>
              <RefreshCcw className="size-4" />
              Reload page
            </Button>
          </div>
        </div>
      </main>
    )
  }
}
