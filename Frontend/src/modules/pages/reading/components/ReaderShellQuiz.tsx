"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type {
  ActiveQuizState,
} from "@/lib/experiment-session"
import type {
  ComprehensionQuestion,
  QuizSelectionHistory,
  SubmitQuizAnswerEntry,
} from "@/lib/comprehension-quiz"
import {
  advanceQuizQuestion,
  retreatQuizQuestion,
  sendQuizLifecycleEvent,
  sendQuizSelectionEvent,
  setQuizSelection,
} from "@/lib/gaze-socket"
import { useQuizRegionTracker } from "@/modules/pages/reading/quiz/useQuizRegionTracker"
import { getErrorMessage } from "@/lib/error-utils"

type SubmitAnswersPayload = {
  materialItemId: string
  answers: SubmitQuizAnswerEntry[]
  selectionHistories: Record<string, QuizSelectionHistory>
}

type Props = {
  materialItemId: string
  materialTitle: string
  questions: ComprehensionQuestion[]
  activeQuizState: ActiveQuizState
  /** Only the participant view should send WS commands. The researcher mirror is read-only. */
  isInteractive: boolean
  /** Called by the participant view on Submit. Mirror does not call this. */
  onSubmit?: (payload: SubmitAnswersPayload) => Promise<void>
  /** Visual ring on prompt/option that the gaze is on (replay / observer views only). */
  focusedRegion?: "prompt" | "option" | null
  focusedOptionId?: string | null
}

function emptyHistory(): QuizSelectionHistory {
  return {
    questionShownAtUnixMs: null,
    firstSelectedAtUnixMs: null,
    lastSelectedAtUnixMs: null,
    selectionChangeCount: 0,
  }
}

export function ReaderShellQuiz({
  materialItemId,
  materialTitle,
  questions,
  activeQuizState,
  isInteractive,
  onSubmit,
  focusedRegion = null,
  focusedOptionId = null,
}: Props) {
  const activeIndex = Math.min(Math.max(activeQuizState.activeQuestionIndex, 0), questions.length - 1)
  const activeQuestion = questions[activeIndex] ?? null
  const totalQuestions = questions.length
  const isLast = activeIndex === totalQuestions - 1
  const activeSelection = activeQuestion
    ? activeQuizState.selectionsByQuestionId[activeQuestion.id] ?? ""
    : ""

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const historyRef = React.useRef<Record<string, QuizSelectionHistory>>({})
  const lastShownAtRef = React.useRef<Record<string, number>>({})

  const { setPromptRef, setOptionRef } = useQuizRegionTracker({
    materialItemId,
    questionId: activeQuestion?.id ?? "",
    questionIndex: activeIndex,
    totalQuestions,
    prompt: activeQuestion?.prompt ?? "",
    options: activeQuestion?.options ?? [],
  })

  // Track the participant's questionShownAt for telemetry. Mirror does not need this.
  React.useEffect(() => {
    if (!isInteractive || !activeQuestion) return
    const now = Date.now()
    lastShownAtRef.current[activeQuestion.id] = now
    if (!historyRef.current[activeQuestion.id]) {
      historyRef.current[activeQuestion.id] = {
        ...emptyHistory(),
        questionShownAtUnixMs: now,
      }
    }
  }, [activeQuestion, isInteractive])

  if (!activeQuestion) {
    return null
  }

  const handleSelect = (optionId: string) => {
    if (!isInteractive) return
    const now = Date.now()
    const existing = historyRef.current[activeQuestion.id] ?? emptyHistory()
    historyRef.current[activeQuestion.id] = {
      questionShownAtUnixMs:
        existing.questionShownAtUnixMs ?? lastShownAtRef.current[activeQuestion.id] ?? now,
      firstSelectedAtUnixMs: existing.firstSelectedAtUnixMs ?? now,
      lastSelectedAtUnixMs: now,
      selectionChangeCount: existing.selectionChangeCount + 1,
    }

    sendQuizSelectionEvent({
      materialItemId,
      questionId: activeQuestion.id,
      selectedOptionId: optionId,
      occurredAtUnixMs: now,
    })

    setQuizSelection(materialItemId, activeQuestion.id, optionId)
  }

  const emitQuestionLeft = (direction: "back" | "next" | "submit") => {
    if (!isInteractive) return
    sendQuizLifecycleEvent({
      materialItemId,
      eventType: "quiz-question-left",
      occurredAtUnixMs: Date.now(),
      questionId: activeQuestion.id,
      questionIndex: activeIndex,
      direction,
    })
  }

  const handleBack = () => {
    if (!isInteractive || activeIndex === 0 || isSubmitting) return
    emitQuestionLeft("back")
    retreatQuizQuestion(materialItemId)
  }

  const handleNext = () => {
    if (!isInteractive || activeSelection.length === 0 || isSubmitting) return
    emitQuestionLeft("next")
    advanceQuizQuestion(materialItemId)
  }

  const handleSubmit = async () => {
    if (!isInteractive || !onSubmit || activeSelection.length === 0 || isSubmitting) return
    setSubmitError(null)
    emitQuestionLeft("submit")

    const answers: SubmitQuizAnswerEntry[] = questions.map((question) => ({
      questionId: question.id,
      selectedOptionId: activeQuizState.selectionsByQuestionId[question.id] ?? "",
    }))

    const selectionHistories: Record<string, QuizSelectionHistory> = {}
    for (const question of questions) {
      const history = historyRef.current[question.id]
      if (history) {
        selectionHistories[question.id] = history
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ materialItemId, answers, selectionHistories })
      sendQuizLifecycleEvent({
        materialItemId,
        eventType: "quiz-submitted",
        occurredAtUnixMs: Date.now(),
      })
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Could not submit your answers."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercent = totalQuestions === 0 ? 0 : ((activeIndex + 1) / totalQuestions) * 100
  const isAdvanceDisabled = !isInteractive || activeSelection.length === 0 || isSubmitting

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-6 py-10">
      <div className="mb-6 space-y-2">
        <p className="text-sm text-muted-foreground">{materialTitle}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Question {activeIndex + 1} of {totalQuestions}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <h2
          ref={setPromptRef}
          className={`rounded-lg text-2xl font-semibold leading-tight transition-shadow ${
            focusedRegion === "prompt"
              ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background"
              : ""
          }`}
        >
          {activeQuestion.prompt}
        </h2>

        <RadioGroup
          value={activeSelection}
          onValueChange={isInteractive ? handleSelect : undefined}
          className="gap-3"
        >
          {activeQuestion.options.map((option) => {
            const isSelected = option.id === activeSelection
            const isGazedAt = focusedRegion === "option" && focusedOptionId === option.id
            return (
              <label
                key={option.id}
                ref={(node) => setOptionRef(option.id, node)}
                htmlFor={`quiz-option-${option.id}`}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                  isGazedAt ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background" : ""
                } ${
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                } ${isInteractive ? "cursor-pointer hover:bg-muted/40" : "cursor-default opacity-95"}`}
              >
                <RadioGroupItem
                  value={option.id}
                  id={`quiz-option-${option.id}`}
                  disabled={!isInteractive}
                />
                <span className="text-base">{option.text}</span>
              </label>
            )
          })}
        </RadioGroup>

        {submitError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          disabled={!isInteractive || activeIndex === 0 || isSubmitting}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (isLast) {
              void handleSubmit()
            } else {
              handleNext()
            }
          }}
          disabled={isAdvanceDisabled}
        >
          {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  )
}
