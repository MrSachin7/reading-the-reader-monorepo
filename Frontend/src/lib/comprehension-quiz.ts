export type ComprehensionOption = {
  id: string
  text: string
}

export type ComprehensionQuestion = {
  id: string
  order: number
  prompt: string
  options: ComprehensionOption[]
  correctOptionId: string
}

export type QuizStatus = "not-started" | "completed"

export type ComprehensionAnswer = {
  questionId: string
  selectedOptionId: string
  isCorrect: boolean
  answeredAtUnixMs: number
}

export type SubmitQuizAnswerEntry = {
  questionId: string
  selectedOptionId: string
}

export type QuizSelectionHistory = {
  questionShownAtUnixMs: number | null
  firstSelectedAtUnixMs: number | null
  lastSelectedAtUnixMs: number | null
  selectionChangeCount: number
}

export type QuizOptionBbox = {
  optionId: string
  x: number
  y: number
  width: number
  height: number
}

export type QuizQuestionLayout = {
  promptX: number
  promptY: number
  promptWidth: number
  promptHeight: number
  optionBboxes: QuizOptionBbox[]
}

export type QuizLifecycleEventType =
  | "quiz-started"
  | "quiz-question-shown"
  | "quiz-question-left"
  | "quiz-submitted"

export type QuizLifecycleEventPayload = {
  materialItemId: string
  eventType: QuizLifecycleEventType
  occurredAtUnixMs: number
  questionCount?: number | null
  questionId?: string | null
  questionIndex?: number | null
  prompt?: string | null
  layout?: QuizQuestionLayout | null
  direction?: "back" | "next" | "submit" | null
}

export type QuizFocusRegionType = "prompt" | "option" | "outside" | "none"

export type QuizFocusEventPayload = {
  materialItemId: string
  questionId: string
  activeRegionType: QuizFocusRegionType
  occurredAtUnixMs: number
  activeOptionId?: string | null
}

export type QuizSelectionEventPayload = {
  materialItemId: string
  questionId: string
  selectedOptionId: string
  occurredAtUnixMs: number
}
