"use client"

import { useEffect, useState } from "react"
import { LoaderCircle, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { downloadExperimentExport } from "@/lib/experiment-export"
import type { ExperimentSessionSnapshot } from "@/lib/experiment-session"
import { getErrorMessage } from "@/lib/error-utils"
import {
  type ReplayExportFormat,
  useFinishExperimentSessionMutation,
  useSaveExperimentReplayExportMutation,
} from "@/redux"

type ExperimentCompletionActionsProps = {
  session: ExperimentSessionSnapshot | null
  source: string
  className?: string
  layout?: "default" | "stacked"
}

export function ExperimentCompletionActions({
  session,
  source,
  className,
  layout = "default",
}: ExperimentCompletionActionsProps) {
  const [saveName, setSaveName] = useState("")
  const [finishExperimentSession, { isLoading: isFinishing }] =
    useFinishExperimentSessionMutation()
  const [saveExperimentReplayExport, { isLoading: isSaving }] =
    useSaveExperimentReplayExportMutation()
  const [downloadFormat, setDownloadFormat] = useState<ReplayExportFormat>("json")
  const [saveFormat, setSaveFormat] = useState<ReplayExportFormat>("json")
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  const canFinish = Boolean(session?.isActive)
  const canDownload = Boolean(!session?.isActive && session?.sessionId && session?.stoppedAtUnixMs)

  useEffect(() => {
    if (!canDownload) {
      return
    }

    const readingTitle = session?.readingSession?.content?.title?.trim()
    const participantName = session?.participant?.name?.trim()
    const nextDefaultName = readingTitle || participantName || "Experiment replay"

    setSaveName((current) => (current.trim().length > 0 ? current : nextDefaultName))
  }, [canDownload, session?.participant?.name, session?.readingSession?.content?.title])

  if (!canFinish && !canDownload) {
    return null
  }

  const handleFinish = async () => {
    setErrorMessage(null)

    try {
      await finishExperimentSession({ source }).unwrap()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not finish the experiment."))
    }
  }

  const handleDownload = async () => {
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setIsDownloading(true)

    try {
      await downloadExperimentExport(downloadFormat)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not download the experiment export."))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSave = async () => {
    setErrorMessage(null)
    setSaveSuccessMessage(null)

    try {
      const saved = await saveExperimentReplayExport({ name: saveName.trim(), format: saveFormat }).unwrap()
      setSaveSuccessMessage(`Saved ${saveFormat.toUpperCase()} as ${saved.name}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save the replay export."))
    }
  }

  const isDownloadFormatSelected = (format: ReplayExportFormat) => downloadFormat === format
  const isSaveFormatSelected = (format: ReplayExportFormat) => saveFormat === format
  const isStacked = layout === "stacked"

  return (
    <div className={cn("flex w-full flex-col items-start gap-3", className)}>
      <div
        className={cn(
          "flex gap-2",
          isStacked ? "w-full flex-col items-stretch" : "flex-wrap items-center"
        )}
      >
        {canFinish ? (
          <Button onClick={() => void handleFinish()} disabled={isFinishing}>
            {isFinishing ? "Finishing experiment..." : "Finish experiment"}
          </Button>
        ) : null}
        {canDownload ? (
          <>
            <div
              className={cn(
                "rounded-lg border bg-muted/20 p-1",
                isStacked ? "grid w-full grid-cols-2" : "inline-flex"
              )}
            >
              {(["json", "csv"] as const).map((format) => (
                <Button
                  key={format}
                  type="button"
                  size="sm"
                  variant={isDownloadFormatSelected(format) ? "default" : "ghost"}
                  className={cn("h-8 px-3 uppercase", isStacked ? "w-full" : undefined)}
                  onClick={() => setDownloadFormat(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
            >
              {isDownloading ? `Downloading ${downloadFormat.toUpperCase()}...` : `Download ${downloadFormat.toUpperCase()}`}
            </Button>
          </>
        ) : null}
      </div>
      {canDownload ? (
        <div className={cn("w-full rounded-2xl border bg-card p-4", isStacked ? "" : "max-w-xl")}>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Save replay in backend</p>
              <p className="text-sm text-muted-foreground">
                Save this replay export as JSON or CSV so it remains available later.
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border bg-muted/20 p-1",
                isStacked ? "grid w-full grid-cols-2" : "inline-flex"
              )}
            >
              {(["json", "csv"] as const).map((format) => (
                <Button
                  key={format}
                  type="button"
                  size="sm"
                  variant={isSaveFormatSelected(format) ? "default" : "ghost"}
                  className={cn("h-8 px-3 uppercase", isStacked ? "w-full" : undefined)}
                  onClick={() => setSaveFormat(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Enter replay export name"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSave()}
                disabled={isSaving || saveName.trim().length === 0}
              >
                {isSaving ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save {saveFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {saveSuccessMessage ? <p className="text-sm text-emerald-700">{saveSuccessMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
