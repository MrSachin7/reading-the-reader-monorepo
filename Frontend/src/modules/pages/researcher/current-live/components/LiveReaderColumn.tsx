"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import type { LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { RemoteTokenAttentionSnapshot } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { LiveMirrorTrustState, LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"

type LiveReaderColumnProps = {
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  followParticipant: boolean
  readerOptions: LiveReaderOptions
  exactMirrorEnabled: boolean
  mirrorTrustState: LiveMirrorTrustState
  showReadingDynamics: boolean
  tokenAttention: RemoteTokenAttentionSnapshot
  onTokenAttentionChange: (snapshot: RemoteTokenAttentionSnapshot) => void
}

type ElementSize = {
  width: number
  height: number
}

function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })
  const ref = useCallback((node: T | null) => {
    setElement(node)
    if (!node) {
      setSize({ width: 0, height: 0 })
    }
  }, [])

  useEffect(() => {
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
  }, [element])

  return { ref, size }
}

export function LiveReaderColumn({
  content,
  presentation,
  readingSession,
  followParticipant,
  readerOptions,
  exactMirrorEnabled,
  mirrorTrustState,
  showReadingDynamics,
  tokenAttention,
  onTokenAttentionChange,
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
  const canAttemptExactMirror =
    exactMirrorEnabled &&
    participantViewportWidth > 0 &&
    participantViewportHeight > 0
  const showExactMirror = canAttemptExactMirror && exactMirrorScale > 0

  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      <div
        className={cn(
          "relative h-full overflow-hidden bg-transparent"
        )}
      >
        {mirrorTrustState.kind !== "exact" ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] shadow-sm backdrop-blur",
                mirrorTrustState.tone === "positive"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : mirrorTrustState.tone === "warning"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                    : "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-200"
              )}
            >
              {mirrorTrustState.label}
            </span>
          </div>
        ) : null}
        {showReadingDynamics ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <span
              className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-800 shadow-sm backdrop-blur"
            >
              Token heat map
            </span>
          </div>
        ) : null}
        {canAttemptExactMirror ? (
          <div
            className={cn(
              "h-full w-full rounded-[1.75rem] border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur-[2px] md:p-6",
              mirrorTrustState.kind === "approximate" && "pt-32"
            )}
          >
            <div
              ref={stageHostRef}
              className={cn(
                "flex h-full w-full items-center justify-center overflow-hidden bg-muted/10",
                !exactMirrorEnabled && "p-3"
              )}
            >
            {showExactMirror ? (
              <div
                className="relative overflow-hidden"
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
                    key={content.documentId}
                    docId={content.documentId}
                    markdown={content.markdown}
                    presentation={presentation}
                    experimentSetupName={content.title}
                    experimentSequenceItems={readingSession.experimentItems}
                    currentExperimentSequenceIndex={readingSession.currentExperimentItemIndex}
                    preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
                    highlightContext={readerOptions.highlightContext}
                    displayGazePosition={false}
                    enableLiveGazeTracking={false}
                    highlightTokensBeingLookedAt={false}
                    highlightRemoteTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
                    showToolbar={false}
                    showBackButton={false}
                    showLixScores={readerOptions.showLixScores}
                    useCompactLixOverlay
                    viewportActivePageIndex={readingSession.participantViewport.activePageIndex}
                    viewportPageCount={readingSession.participantViewport.pageCount}
                    viewportScrollTopPx={readingSession.participantViewport.scrollTopPx}
                    viewportWidthPx={participantViewportWidth}
                    viewportHeightPx={participantViewportHeight}
                    remoteFocus={{
                      isInsideReadingArea: readingSession.focus.isInsideReadingArea,
                      normalizedContentX: readingSession.focus.normalizedContentX,
                      normalizedContentY: readingSession.focus.normalizedContentY,
                      activeTokenId: readingSession.focus.activeTokenId,
                      activeSentenceId: readingSession.focus.activeSentenceId,
                      updatedAtUnixMs: readingSession.focus.updatedAtUnixMs,
                    }}
                    remoteTokenAttention={showReadingDynamics ? tokenAttention : null}
                    onRemoteTokenAttentionChange={onTokenAttentionChange}
                    showRemoteFocusMarker={readerOptions.displayGazePosition}
                    embedded
                    embeddedSurfaceStyle="bare"
                    latestIntervention={readingSession.latestIntervention ?? null}
                    initialPresentation={readingSession.initialPresentation ?? null}
                    frameClassName="h-full"
                    frameStyle={{
                      width: `${participantViewportWidth}px`,
                      height: `${participantViewportHeight}px`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                Preparing exact mirror layout…
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className={cn("h-full overflow-hidden", mirrorTrustState.kind === "approximate" && "pt-28")}>
            <div className="flex h-full w-full flex-col rounded-[1.75rem] border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur-[2px] md:p-6">
              <ReaderShell
                key={content.documentId}
                docId={content.documentId}
                markdown={content.markdown}
                presentation={presentation}
                experimentSetupName={content.title}
                experimentSequenceItems={readingSession.experimentItems}
                currentExperimentSequenceIndex={readingSession.currentExperimentItemIndex}
                preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
                highlightContext={readerOptions.highlightContext}
                displayGazePosition={false}
                enableLiveGazeTracking={false}
                highlightTokensBeingLookedAt={false}
                highlightRemoteTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
                showToolbar={readerOptions.showToolbar}
                showBackButton={readerOptions.showBackButton}
                showLixScores={readerOptions.showLixScores}
                viewportActivePageIndex={
                  followParticipant ? readingSession.participantViewport.activePageIndex : null
                }
                viewportPageCount={
                  followParticipant ? readingSession.participantViewport.pageCount : null
                }
                viewportScrollTopPx={
                  followParticipant ? readingSession.participantViewport.scrollTopPx : null
                }
                remoteFocus={{
                  isInsideReadingArea: readingSession.focus.isInsideReadingArea,
                  normalizedContentX: readingSession.focus.normalizedContentX,
                  normalizedContentY: readingSession.focus.normalizedContentY,
                  activeTokenId: readingSession.focus.activeTokenId,
                  activeSentenceId: readingSession.focus.activeSentenceId,
                  updatedAtUnixMs: readingSession.focus.updatedAtUnixMs,
                }}
                remoteTokenAttention={showReadingDynamics ? tokenAttention : null}
                onRemoteTokenAttentionChange={onTokenAttentionChange}
                showRemoteFocusMarker={readerOptions.displayGazePosition}
                embedded
                embeddedSurfaceStyle="bare"
                latestIntervention={readingSession.latestIntervention ?? null}
                initialPresentation={readingSession.initialPresentation ?? null}
                frameClassName="h-full"
                frameStyle={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
