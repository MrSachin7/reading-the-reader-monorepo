"use client"

import { useId, useRef, useState, type ChangeEvent } from "react"
import { FileCog, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { convertReplayExportToProcessed } from "@/lib/experiment-export"
import { getErrorMessage } from "@/lib/error-utils"

export function ConvertToProcessedCard() {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    setErrorMessage(null)
    setIsConverting(true)
    try {
      await convertReplayExportToProcessed(file)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not convert the export to a processed report."))
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-lg font-semibold">Convert to processed</p>
        <p className="text-sm text-muted-foreground">
          Turn a full JSON export file into its processed report without re-running the session.
        </p>
      </div>
      <Input
        id={inputId}
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(event) => void handleChange(event)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isConverting}
        onClick={() => inputRef.current?.click()}
      >
        {isConverting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <FileCog className="h-4 w-4" />
        )}
        {isConverting ? "Converting..." : "Choose full export"}
      </Button>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </section>
  )
}
