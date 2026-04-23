"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"

import { useReaderAppearanceSync } from "@/hooks/use-reader-appearance-sync"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  buildReplayFrame,
  buildReplayKeyEvents,
  findReplayKeyEventIndex,
  parseExperimentReplayExport,
  readExperimentReplayExportFile,
  resolveReplayDurationMs,
  type ExperimentReplayExport,
} from "@/lib/experiment-replay"
import { READER_SHELL_SETTINGS_DEFAULTS } from "@/lib/reader-shell-settings"
import { normalizeReaderAppearance } from "@/lib/reader-appearance"
import { ReplayControlsColumn } from "@/modules/pages/replay/components/ReplayControlsColumn"
import { ReplayMetadataColumn } from "@/modules/pages/replay/components/ReplayMetadataColumn"
import { ReplayReaderColumn } from "@/modules/pages/replay/components/ReplayReaderColumn"
import { ReplayUploadState } from "@/modules/pages/replay/components/ReplayUploadState"
import { type ReplayPlaybackSpeed, type ReplayReaderOptions } from "@/modules/pages/replay/types"
import { normalizeReadingPresentation } from "@/modules/pages/reading/lib/readingPresentation"
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown"
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize"
import {
  useGetReaderShellSettingsQuery,
  useGetSavedExperimentReplayExportsQuery,
  useLazyGetSavedExperimentReplayExportByIdQuery,
} from "@/redux"

export default function ReplayPage() {
  const inputId = useId()
  const { data: readerShellSettings } = useGetReaderShellSettingsQuery()
  const [replay, setReplay] = useState<ExperimentReplayExport | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<ReplayPlaybackSpeed>(1)
  const persistedReaderOptions = readerShellSettings?.replay ?? READER_SHELL_SETTINGS_DEFAULTS.replay
  const [localReaderOptions, setLocalReaderOptions] = useState<ReplayReaderOptions | null>(null)
  const readerOptions = localReaderOptions ?? persistedReaderOptions
  const [loadingExportId, setLoadingExportId] = useState<string | null>(null)
  const isPlayingRef = useRef(isPlaying)
  const { data: savedExports = [], isLoading: isLoadingSavedExports } =
    useGetSavedExperimentReplayExportsQuery()
  const [getSavedExperimentReplayExportById] = useLazyGetSavedExperimentReplayExportByIdQuery()

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const durationMs = useMemo(() => (replay ? resolveReplayDurationMs(replay) : 0), [replay])

  useEffect(() => {
    if (!replay || !isPlaying) {
      return
    }

    let frameId = 0
    let lastNow = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - lastNow) * playbackSpeed
      lastNow = now

      setCurrentTimeMs((previous) => {
        const next = Math.min(previous + elapsed, durationMs)
        if (next >= durationMs && isPlayingRef.current) {
          setIsPlaying(false)
        }
        return next
      })

      if (isPlayingRef.current) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [durationMs, isPlaying, playbackSpeed, replay])

  const frame = useMemo(() => {
    if (!replay) {
      return null
    }

    return buildReplayFrame(replay, currentTimeMs)
  }, [currentTimeMs, replay])

  const replayEvents = useMemo(() => (replay ? buildReplayKeyEvents(replay) : []), [replay])
  const activeEventIndex = useMemo(
    () => findReplayKeyEventIndex(replayEvents, currentTimeMs),
    [currentTimeMs, replayEvents]
  )

  const readingSession = frame?.session.readingSession ?? null
  const content = readingSession?.content ?? null
  const replayAppearance = readingSession ? normalizeReaderAppearance(readingSession.appearance) : null
  const presentation = useMemo(
    () =>
      normalizeReadingPresentation({
        fontFamily: readingSession?.presentation.fontFamily,
        fontSizePx: readingSession?.presentation.fontSizePx,
        lineWidthPx: readingSession?.presentation.lineWidthPx,
        lineHeight: readingSession?.presentation.lineHeight,
        letterSpacingEm: readingSession?.presentation.letterSpacingEm,
        editableByExperimenter: readingSession?.presentation.editableByResearcher,
      }),
    [readingSession]
  )

  useReaderAppearanceSync(replayAppearance)

  const parsedDoc = useMemo(() => (content ? parseMinimalMarkdown(content.markdown) : null), [content])
  const tokenizedBlocks = useMemo(
    () => (parsedDoc && content ? tokenizeDocument(parsedDoc, content.documentId) : []),
    [content, parsedDoc]
  )
  const tokenTextLookup = useMemo(() => {
    const entries = new Map<string, string>()

    for (const block of tokenizedBlocks) {
      if ("runs" in block) {
        for (const run of block.runs) {
          for (const token of run.tokens) {
            if (token.kind === "word") {
              entries.set(token.id, token.text)
            }
          }
        }
      }

      if ("items" in block) {
        for (const item of block.items) {
          for (const run of item.runs) {
            for (const token of run.tokens) {
              if (token.kind === "word") {
                entries.set(token.id, token.text)
              }
            }
          }
        }
      }
    }

    return entries
  }, [tokenizedBlocks])

  const activeWord =
    readingSession?.focus.activeTokenId && tokenTextLookup.has(readingSession.focus.activeTokenId)
      ? tokenTextLookup.get(readingSession.focus.activeTokenId)
      : readingSession?.focus.activeTokenId

  const setReaderOption = useCallback((key: keyof ReplayReaderOptions, value: boolean) => {
    setLocalReaderOptions((previous) => ({
      ...(previous ?? persistedReaderOptions),
      [key]: value,
    }))
  }, [persistedReaderOptions])

  const handleImportedFile = useCallback(async (file: File) => {
    try {
      const parsed = await readExperimentReplayExportFile(file)
      setReplay(parsed)
      setCurrentTimeMs(0)
      setPlaybackSpeed(1)
      setIsPlaying(false)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not read the replay file.")
      setIsPlaying(false)
    }
  }, [])

  const handleLoadSavedExport = useCallback(
    async (id: string) => {
      setLoadingExportId(id)
      try {
        const payload = await getSavedExperimentReplayExportById(id).unwrap()
        const parsed = parseExperimentReplayExport(payload)
        setReplay(parsed)
        setCurrentTimeMs(0)
        setPlaybackSpeed(1)
        setIsPlaying(false)
        setErrorMessage(null)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load the saved replay export.")
        setIsPlaying(false)
      } finally {
        setLoadingExportId(null)
      }
    },
    [getSavedExperimentReplayExportById]
  )

  const handleInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      await handleImportedFile(file)
      event.target.value = ""
    },
    [handleImportedFile]
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      setIsDragging(false)

      const file = event.dataTransfer.files?.[0]
      if (!file) {
        return
      }

      await handleImportedFile(file)
    },
    [handleImportedFile]
  )

  const handleTogglePlayback = useCallback(() => {
    if (!replay) {
      return
    }

    if (currentTimeMs >= durationMs) {
      setCurrentTimeMs(0)
    }

    setIsPlaying((previous) => !previous)
  }, [currentTimeMs, durationMs, replay])

  const handleRestart = useCallback(() => {
    setCurrentTimeMs(0)
    setIsPlaying(false)
  }, [])

  const handleSeek = useCallback((timeMs: number) => {
    setCurrentTimeMs(timeMs)
    setIsPlaying(false)
  }, [])

  const handleClear = useCallback(() => {
    setReplay(null)
    setErrorMessage(null)
    setCurrentTimeMs(0)
    setPlaybackSpeed(1)
    setIsPlaying(false)
    setLocalReaderOptions(null)
  }, [])

  if (!replay) {
    return (
        <ReplayUploadState
          inputId={inputId}
          isDragging={isDragging}
          errorMessage={errorMessage}
          isLoadingSavedExports={isLoadingSavedExports}
          savedExports={savedExports}
          loadingExportId={loadingExportId}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onInputChange={handleInputChange}
          onSelectSavedExport={(id) => void handleLoadSavedExport(id)}
        />
      )
  }

  if (!readingSession || !content || !frame) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Replay</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The export was loaded, but it does not contain the baseline and timeline data needed for replay.
          </p>
        </header>
        <Alert variant="destructive">
          <AlertTitle>Unsupported replay payload</AlertTitle>
          <AlertDescription>
            Upload a completed experiment export that includes reading material and the recorded timeline.
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-background px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto grid h-full w-full max-w-[1600px] min-h-0 gap-4 overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)_19rem]">
        <ReplayControlsColumn
          inputId={inputId}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          readerOptions={readerOptions}
          onTimeChange={handleSeek}
          onTogglePlayback={handleTogglePlayback}
          onRestart={handleRestart}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onInputChange={handleInputChange}
          onClear={handleClear}
          onReaderOptionChange={setReaderOption}
        />

        <ReplayReaderColumn
          errorMessage={errorMessage}
          content={content}
          presentation={presentation}
          readingSession={readingSession}
          readerOptions={readerOptions}
        />

        <ReplayMetadataColumn
          frame={frame}
          readingSession={readingSession}
          activeWord={activeWord}
          replayEvents={replayEvents}
          activeEventIndex={activeEventIndex}
          onSeek={handleSeek}
        />
      </div>
    </main>
  )
}
