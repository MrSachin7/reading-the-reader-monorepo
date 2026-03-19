"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"
import { cn } from "@/lib/utils"

type LiveReaderColumnProps = {
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  followParticipant: boolean
  readerOptions: LiveReaderOptions
  exactMirrorEnabled: boolean
  mirrorStatusLabel: string
}

type ElementSize = {
  width: number
  height: number
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return { ref, size }
}

export function LiveReaderColumn({
  content,
  presentation,
  readingSession,
  followParticipant,
  readerOptions,
  exactMirrorEnabled,
  mirrorStatusLabel,
}: LiveReaderColumnProps) {
  const { ref: stageHostRef, size: stageHostSize } = useElementSize<HTMLDivElement>()
  const participantViewport = readingSession.participantViewport
  const participantViewportWidth = Math.max(participantViewport.viewportWidthPx, 0)
  const participantViewportHeight = Math.max(participantViewport.viewportHeightPx, 0)

  const exactMirrorScale = useMemo(() => {
    if (
      !exactMirrorEnabled ||
      participantViewportWidth <= 0 ||
      participantViewportHeight <= 0
    ) {
      return 0
    }

    if (stageHostSize.width <= 0 || stageHostSize.height <= 0) {
      return 0
    }

    return Math.min(
      stageHostSize.width / participantViewportWidth,
      stageHostSize.height / participantViewportHeight,
      1
    )
  }, [
    exactMirrorEnabled,
    participantViewportHeight,
    participantViewportWidth,
    stageHostSize.height,
    stageHostSize.width,
  ])

  const scaledStageWidth = participantViewportWidth * exactMirrorScale
  const scaledStageHeight = participantViewportHeight * exactMirrorScale
  const showExactMirror =
    exactMirrorEnabled &&
    participantViewportWidth > 0 &&
    participantViewportHeight > 0 &&
    exactMirrorScale > 0

  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      <div className="relative h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <span
            className={cn(
              "inline-flex rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] shadow-sm backdrop-blur",
              showExactMirror
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700"
            )}
          >
            {mirrorStatusLabel}
          </span>
        </div>

        {showExactMirror ? (
          <div
            ref={stageHostRef}
            className="flex h-full w-full items-center justify-center overflow-hidden bg-muted/10 p-3"
          >
            <div
              className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
              style={{
                width: `${scaledStageWidth}px`,
                height: `${scaledStageHeight}px`,
              }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  width: `${participantViewportWidth}px`,
                  height: `${participantViewportHeight}px`,
                  transform: `scale(${exactMirrorScale})`,
                }}
              >
                <ReaderShell
                  docId={content.documentId}
                  markdown={content.markdown}
                  presentation={presentation}
                  experimentSetupName={content.title}
                  preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
                  highlightContext={readerOptions.highlightContext}
                  displayGazePosition={false}
                  enableLiveGazeTracking={false}
                  highlightTokensBeingLookedAt={false}
                  highlightRemoteTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
                  showToolbar={false}
                  showBackButton={false}
                  showLixScores={false}
                  viewportScrollProgress={readingSession.participantViewport.scrollProgress}
                  viewportScrollTopPx={readingSession.participantViewport.scrollTopPx}
                  remoteFocus={{
                    isInsideReadingArea: readingSession.focus.isInsideReadingArea,
                    normalizedContentX: readingSession.focus.normalizedContentX,
                    normalizedContentY: readingSession.focus.normalizedContentY,
                    activeTokenId: readingSession.focus.activeTokenId,
                  }}
                  showRemoteFocusMarker={readerOptions.displayGazePosition}
                  embedded
                  frameClassName="h-full rounded-none border-0 shadow-none"
                  frameStyle={{
                    width: `${participantViewportWidth}px`,
                    height: `${participantViewportHeight}px`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <ReaderShell
            docId={content.documentId}
            markdown={content.markdown}
            presentation={presentation}
            experimentSetupName={content.title}
            preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
            highlightContext={readerOptions.highlightContext}
            displayGazePosition={false}
            enableLiveGazeTracking={false}
            highlightTokensBeingLookedAt={false}
            highlightRemoteTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
            showToolbar={readerOptions.showToolbar}
            showBackButton={readerOptions.showBackButton}
            showLixScores={readerOptions.showLixScores}
            viewportScrollProgress={
              followParticipant ? readingSession.participantViewport.scrollProgress : null
            }
            viewportScrollTopPx={
              followParticipant ? readingSession.participantViewport.scrollTopPx : null
            }
            remoteFocus={{
              isInsideReadingArea: readingSession.focus.isInsideReadingArea,
              normalizedContentX: readingSession.focus.normalizedContentX,
              normalizedContentY: readingSession.focus.normalizedContentY,
              activeTokenId: readingSession.focus.activeTokenId,
            }}
            showRemoteFocusMarker={readerOptions.displayGazePosition}
            embedded
            frameClassName="mx-auto rounded-none border-0 shadow-none"
            frameStyle={{
              width: "100%",
              maxWidth: "980px",
            }}
          />
        )}
      </div>
    </div>
  )
}
