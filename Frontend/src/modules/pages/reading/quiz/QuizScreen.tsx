"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/error-utils"
import type { ComprehensionQuestion, SubmitQuizAnswerEntry } from "@/lib/comprehension-quiz"
import { useSubmitQuizAnswersMutation } from "@/redux"

type Props = {
  materialItemId: string
  materialTitle: string
  questions: ComprehensionQuestion[]
  onCompleted: () => void
}

export function QuizScreen({ materialItemId, materialTitle, questions, onCompleted }: Props) {
  const [submitQuizAnswers, { isLoading }] = useSubmitQuizAnswersMutation()
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [selections, setSelections] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string | null>(null)

  const totalQuestions = questions.length
  const activeQuestion = questions[activeIndex]
  const activeSelection = activeQuestion ? selections[activeQuestion.id] ?? "" : ""
  const isLast = activeIndex === totalQuestions - 1
  const canAdvance = activeSelection.length > 0 && !isLoading

  if (!activeQuestion) {
    return null
  }

  const handleSelect = (optionId: string) => {
    setSelections((current) => ({ ...current, [activeQuestion.id]: optionId }))
  }

  const handleBack = () => {
    if (activeIndex === 0 || isLoading) return
    setActiveIndex((current) => current - 1)
  }

  const handleNextOrSubmit = async () => {
    if (!canAdvance) return
    if (!isLast) {
      setActiveIndex((current) => current + 1)
      return
    }

    setError(null)
    const payload: SubmitQuizAnswerEntry[] = questions.map((question) => ({
      questionId: question.id,
      selectedOptionId: selections[question.id] ?? "",
    }))

    try {
      await submitQuizAnswers({ materialItemId, answers: payload }).unwrap()
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
        <h2 className="text-2xl font-semibold leading-tight">{activeQuestion.prompt}</h2>

        <RadioGroup value={activeSelection} onValueChange={handleSelect} className="gap-3">
          {activeQuestion.options.map((option) => {
            const isSelected = option.id === activeSelection
            return (
              <label
                key={option.id}
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
