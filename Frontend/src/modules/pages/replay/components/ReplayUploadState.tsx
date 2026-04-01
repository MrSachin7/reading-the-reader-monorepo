"use client"

import type { ChangeEventHandler, DragEventHandler } from "react"
import { FileUp, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { SavedExperimentReplayExportSummary } from "@/redux"

type ReplayUploadStateProps = {
  inputId: string
  isDragging: boolean
  errorMessage: string | null
  isLoadingSavedExports: boolean
  savedExports: SavedExperimentReplayExportSummary[]
  loadingExportId: string | null
  onDragOver: DragEventHandler<HTMLLabelElement>
  onDragLeave: DragEventHandler<HTMLLabelElement>
  onDrop: DragEventHandler<HTMLLabelElement>
  onInputChange: ChangeEventHandler<HTMLInputElement>
  onSelectSavedExport: (id: string) => void
}

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

export function ReplayUploadState({
  inputId,
  isDragging,
  errorMessage,
  isLoadingSavedExports,
  savedExports,
  loadingExportId,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onSelectSavedExport,
}: ReplayUploadStateProps) {
  return (
    <main className="h-[100dvh] overflow-hidden bg-background px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto grid h-full max-w-6xl min-h-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_22rem]">
        <label
          htmlFor={inputId}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex min-h-0 h-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-10 text-center shadow-sm transition-all",
            isDragging
              ? "border-sky-400 bg-sky-500/8 shadow-[0_0_0_4px_rgba(14,165,233,0.14)]"
              : "border-border hover:border-sky-300"
          )}
        >
          <Input
            id={inputId}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={onInputChange}
          />
          <div className="flex h-18 w-18 items-center justify-center rounded-2xl border bg-background shadow-sm">
            <FileUp className="h-8 w-8 text-sky-500" />
          </div>
          <p className="mt-6 text-xl font-semibold">Upload replay JSON</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Drop the exported file here or choose it from disk.
          </p>
          <Button type="button" size="lg" asChild className="mt-6">
            <span>
              <Upload className="h-4 w-4" />
              Choose file
            </span>
          </Button>
        </label>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-lg font-semibold">Saved replay exports</p>
            <p className="text-sm text-muted-foreground">
              Load a replay file that was saved on the backend.
            </p>
          </div>
          <ScrollArea className="mt-4 min-h-0 flex-1 pr-3">
            <div className="space-y-3">
              {isLoadingSavedExports ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Loading saved replay exports...
                </div>
              ) : savedExports.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No saved replay exports yet.
                </div>
              ) : (
                savedExports.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSavedExport(item.id)}
                    disabled={loadingExportId === item.id}
                    className="w-full rounded-xl border p-4 text-left transition-colors hover:border-sky-300 hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <Badge variant="outline" className="uppercase">
                        {item.format}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Saved {formatDate(item.updatedAtUnixMs)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </section>

        {errorMessage ? (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertTitle>Replay import failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </main>
  )
}
