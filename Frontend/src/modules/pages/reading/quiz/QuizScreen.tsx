"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/error-utils"
import type {
  ComprehensionQuestion,
  QuizSelectionHistory,
  SubmitQuizAnswerEntry,
} from "@/lib/comprehension-quiz"
import { sendQuizLifecycleEvent, sendQuizSelectionEvent } from "@/lib/gaze-socket"
import { useSubmitQuizAnswersMutation } from "@/redux"
import { useQuizRegionTracker } from "@/modules/pages/reading/quiz/useQuizRegionTracker"

type Props = {
  materialItemId: string
  materialTitle: string
  questions: ComprehensionQuestion[]
  onCompleted: () => void
}

function emptyHistory(): QuizSelectionHistory {
  return {
    questionShownAtUnixMs: null,
    firstSelectedAtUnixMs: null,
    lastSelectedAtUnixMs: null,
    selectionChangeCount: 0,
  }
}

export function QuizScreen({ materialItemId, materialTitle, questions, onCompleted }: Props) {
  const [submitQuizAnswers, { isLoading }] = useSubmitQuizAnswersMutation()
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [selections, setSelections] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string | null>(null)
  const historyRef = React.useRef<Record<string, QuizSelectionHistory>>({})
  const lastShownAtRef = React.useRef<Record<string, number>>({})

  const totalQuestions = questions.length
  const activeQuestion = questions[activeIndex]

  const { setPromptRef, setOptionRef } = useQuizRegionTracker({
    materialItemId,
    questionId: activeQuestion?.id ?? "",
    questionIndex: activeIndex,
    totalQuestions,
    prompt: activeQuestion?.prompt ?? "",
    options: activeQuestion?.options ?? [],
  })

  // Stamp questionShownAtUnixMs the first time each question is rendered in this attempt
  React.useEffect(() => {
    if (!activeQuestion) {
      return
    }
    const now = Date.now()
    lastShownAtRef.current[activeQuestion.id] = now
    if (!historyRef.current[activeQuestion.id]) {
      historyRef.current[activeQuestion.id] = {
        ...emptyHistory(),
        questionShownAtUnixMs: now,
      }
    }
  }, [activeQuestion])

  const activeSelection = activeQuestion ? selections[activeQuestion.id] ?? "" : ""
  const isLast = activeIndex === totalQuestions - 1
  const canAdvance = activeSelection.length > 0 && !isLoading

  if (!activeQuestion) {
    return null
  }

  const handleSelect = (optionId: string) => {
    if (!activeQuestion) return
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

    setSelections((current) => ({ ...current, [activeQuestion.id]: optionId }))
  }

  const emitQuestionLeft = (direction: "back" | "next" | "submit") => {
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
    if (activeIndex === 0 || isLoading) return
    emitQuestionLeft("back")
    setActiveIndex((current) => current - 1)
  }

  const handleNextOrSubmit = async () => {
    if (!canAdvance) return
    if (!isLast) {
      emitQuestionLeft("next")
      setActiveIndex((current) => current + 1)
      return
    }

    setError(null)
    emitQuestionLeft("submit")

    const payload: SubmitQuizAnswerEntry[] = questions.map((question) => ({
      questionId: question.id,
      selectedOptionId: selections[question.id] ?? "",
    }))

    const selectionHistories: Record<string, QuizSelectionHistory> = {}
    for (const question of questions) {
      const history = historyRef.current[question.id]
      if (history) {
        selectionHistories[question.id] = history
      }
    }

    try {
      await submitQuizAnswers({
        materialItemId,
        answers: payload,
        selectionHistories,
      }).unwrap()

      sendQuizLifecycleEvent({
        materialItemId,
        eventType: "quiz-submitted",
        occurredAtUnixMs: Date.now(),
      })

      onCompleted()
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not submit your answers."))
    }
  }

  const progressPercent = ((activeIndex + 1) / totalQuestions) * 100

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
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
          className="text-2xl font-semibold leading-tight"
        >
          {activeQuestion.prompt}
        </h2>

        <RadioGroup value={activeSelection} onValueChange={handleSelect} className="gap-3">
          {activeQuestion.options.map((option) => {
            const isSelected = option.id === activeSelection
            return (
              <label
                key={option.id}
                ref={(node) => setOptionRef(option.id, node)}
                htmlFor={`quiz-option-${option.id}`}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value={option.id} id={`quiz-option-${option.id}`} />
                <span className="text-base">{option.text}</span>
              </label>
            )
          })}
        </RadioGroup>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          disabled={activeIndex === 0 || isLoading}
        >
          Back
        </Button>
        <Button type="button" onClick={() => void handleNextOrSubmit()} disabled={!canAdvance}>
          {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  )
}
