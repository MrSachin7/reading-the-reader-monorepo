"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { ComprehensionOption, ComprehensionQuestion } from "@/lib/comprehension-quiz"

type Props = {
  value: ComprehensionQuestion[]
  onChange: (next: ComprehensionQuestion[]) => void
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function reorder(questions: ComprehensionQuestion[]): ComprehensionQuestion[] {
  return questions.map((question, index) => ({ ...question, order: index }))
}

function buildEmptyQuestion(): ComprehensionQuestion {
  const optionAId = makeId()
  const optionBId = makeId()
  return {
    id: makeId(),
    order: 0,
    prompt: "",
    options: [
      { id: optionAId, text: "" },
      { id: optionBId, text: "" },
    ],
    correctOptionId: optionAId,
  }
}

function questionIsValid(question: ComprehensionQuestion): boolean {
  if (question.prompt.trim().length === 0) return false
  if (question.options.length < 2) return false
  if (question.options.some((option) => option.text.trim().length === 0)) return false
  if (!question.options.some((option) => option.id === question.correctOptionId)) return false
  return true
}

export function ComprehensionQuizEditor({ value, onChange }: Props) {
  const addQuestion = () => onChange(reorder([...value, buildEmptyQuestion()]))

  const removeQuestion = (questionId: string) =>
    onChange(reorder(value.filter((question) => question.id !== questionId)))

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    const index = value.findIndex((question) => question.id === questionId)
    if (index < 0) return
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    onChange(reorder(next))
  }

  const patchQuestion = (
    questionId: string,
    patch: Partial<ComprehensionQuestion> | ((question: ComprehensionQuestion) => ComprehensionQuestion)
  ) => {
    onChange(
      value.map((question) => {
        if (question.id !== questionId) return question
        return typeof patch === "function" ? patch(question) : { ...question, ...patch }
      })
    )
  }

  const addOption = (questionId: string) =>
    patchQuestion(questionId, (question) => ({
      ...question,
      options: [...question.options, { id: makeId(), text: "" }],
    }))

  const removeOption = (questionId: string, optionId: string) =>
    patchQuestion(questionId, (question) => {
      if (question.options.length <= 2) return question
      const nextOptions = question.options.filter((option) => option.id !== optionId)
      const nextCorrectId =
        question.correctOptionId === optionId ? (nextOptions[0]?.id ?? "") : question.correctOptionId
      return { ...question, options: nextOptions, correctOptionId: nextCorrectId }
    })

  const setOptionText = (questionId: string, optionId: string, text: string) =>
    patchQuestion(questionId, (question) => ({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, text } : option
      ),
    }))

  const setCorrect = (questionId: string, optionId: string) =>
    patchQuestion(questionId, { correctOptionId: optionId })

  const setPrompt = (questionId: string, prompt: string) => patchQuestion(questionId, { prompt })

  if (value.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
        <ListChecks className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No comprehension questions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a question to check what the reader took away from this material.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {value.map((question, index) => {
        const isValid = questionIsValid(question)
        return (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            isFirst={index === 0}
            isLast={index === value.length - 1}
            isValid={isValid}
            onMoveUp={() => moveQuestion(question.id, -1)}
            onMoveDown={() => moveQuestion(question.id, 1)}
            onRemove={() => removeQuestion(question.id)}
            onPromptChange={(prompt) => setPrompt(question.id, prompt)}
            onOptionTextChange={(optionId, text) => setOptionText(question.id, optionId, text)}
            onOptionRemove={(optionId) => removeOption(question.id, optionId)}
            onCorrectChange={(optionId) => setCorrect(question.id, optionId)}
            onAddOption={() => addOption(question.id)}
          />
        )
      })}

      <Button type="button" variant="outline" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" />
        Add question
      </Button>
    </div>
  )
}

type QuestionCardProps = {
  question: ComprehensionQuestion
  index: number
  isFirst: boolean
  isLast: boolean
  isValid: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onPromptChange: (prompt: string) => void
  onOptionTextChange: (optionId: string, text: string) => void
  onOptionRemove: (optionId: string) => void
  onCorrectChange: (optionId: string) => void
  onAddOption: () => void
}

function QuestionCard({
  question,
  index,
  isFirst,
  isLast,
  isValid,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPromptChange,
  onOptionTextChange,
  onOptionRemove,
  onCorrectChange,
  onAddOption,
}: QuestionCardProps) {
  const canRemoveOption = question.options.length > 2

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Question {index + 1}</span>
          {!isValid ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              Incomplete
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move question up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move question down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove question"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`prompt-${question.id}`}>
            Prompt
          </label>
          <Textarea
            id={`prompt-${question.id}`}
            value={question.prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="What do you want to ask the reader?"
            className="min-h-20 resize-y"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Options — select the correct answer
          </p>
          <RadioGroup
            value={question.correctOptionId}
            onValueChange={onCorrectChange}
            className="gap-2"
          >
            {question.options.map((option, optionIndex) => (
              <OptionRow
                key={option.id}
                option={option}
                index={optionIndex}
                canRemove={canRemoveOption}
                onTextChange={(text) => onOptionTextChange(option.id, text)}
                onRemove={() => onOptionRemove(option.id)}
              />
            ))}
          </RadioGroup>
          <Button type="button" variant="ghost" size="sm" onClick={onAddOption}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add option
          </Button>
        </div>
      </div>
    </div>
  )
}

type OptionRowProps = {
  option: ComprehensionOption
  index: number
  canRemove: boolean
  onTextChange: (text: string) => void
  onRemove: () => void
}

function OptionRow({ option, index, canRemove, onTextChange, onRemove }: OptionRowProps) {
  const inputId = `option-${option.id}`
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={option.id} id={`radio-${option.id}`} aria-label={`Mark option ${index + 1} as correct`} />
      <Input
        id={inputId}
        value={option.text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove option ${index + 1}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
