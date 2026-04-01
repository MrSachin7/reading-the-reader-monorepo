"use client"

import { useEffect, useState } from "react"
import { ChevronDown, LoaderCircle, Save } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { downloadExperimentExport } from "@/lib/experiment-export"
import type { ExperimentSessionSnapshot } from "@/lib/experiment-session"
import { getErrorMessage } from "@/lib/error-utils"
import { useReadingSettings } from "@/modules/pages/reading/lib/useReadingSettings"
import {
  type ReplayExportFormat,
  resetReadingSessionState,
  resetStepOneState,
  resetStepTwoState,
  resetStepThreeState,
  useAppDispatch,
  useFinishExperimentSessionMutation,
  useResetExperimentSessionMutation,
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
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { resetReadingSettings } = useReadingSettings()
  const [saveName, setSaveName] = useState("")
  const [finishExperimentSession, { isLoading: isFinishing }] =
    useFinishExperimentSessionMutation()
  const [resetExperimentSession, { isLoading: isResetting }] =
    useResetExperimentSessionMutation()
  const [saveExperimentReplayExport, { isLoading: isSaving }] =
    useSaveExperimentReplayExportMutation()
  const [downloadingFormat, setDownloadingFormat] = useState<ReplayExportFormat | null>(null)
  const [savingFormat, setSavingFormat] = useState<ReplayExportFormat | null>(null)
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

  const handleStartNewExperiment = async () => {
    setErrorMessage(null)
    setSaveSuccessMessage(null)

    try {
      await resetExperimentSession().unwrap()
      dispatch(resetStepOneState())
      dispatch(resetStepTwoState())
      dispatch(resetStepThreeState())
      dispatch(resetReadingSessionState())
      resetReadingSettings()
      setSaveName("")
      router.push("/experiment")
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not start a new experiment."))
    }
  }

  const handleDownload = async (format: ReplayExportFormat) => {
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setDownloadingFormat(format)

    try {
      await downloadExperimentExport(format)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not download the experiment export."))
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleSave = async (format: ReplayExportFormat) => {
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setSavingFormat(format)

    try {
      const saved = await saveExperimentReplayExport({ name: saveName.trim(), format }).unwrap()
      setSaveSuccessMessage(`Saved ${format.toUpperCase()} as ${saved.name}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save the replay export."))
    } finally {
      setSavingFormat(null)
    }
  }

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
            <Button onClick={() => void handleStartNewExperiment()} disabled={isResetting}>
              {isResetting ? "Starting new experiment..." : "Start new experiment"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownload("json")}
              disabled={downloadingFormat !== null || isResetting}
            >
              {downloadingFormat === "json" ? "Downloading JSON..." : "Download JSON"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownload("csv")}
              disabled={downloadingFormat !== null || isResetting}
            >
              {downloadingFormat === "csv" ? "Downloading CSV..." : "Download CSV"}
            </Button>
          </>
        ) : null}
      </div>
      {canDownload ? (
        <div className={cn("w-full", isStacked ? "" : "max-w-xl")}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Export name"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isSaving ||
                    isResetting ||
                    savingFormat !== null ||
                    saveName.trim().length === 0
                  }
                >
                  {savingFormat ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {savingFormat ? `Saving ${savingFormat.toUpperCase()}...` : "Save"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleSave("json")}>
                  Save JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleSave("csv")}>
                  Save CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : null}
      {saveSuccessMessage ? <p className="text-sm text-emerald-700">{saveSuccessMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
