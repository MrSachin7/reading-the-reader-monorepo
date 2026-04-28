"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { LucideIcon } from "lucide-react"
import { BookOpen, Crosshair, FileText, MousePointer2, Plus, ScanEye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Controller, useForm, useWatch } from "react-hook-form"
import * as z from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFontTheme } from "@/hooks/use-font-theme"
import { usePaletteTheme } from "@/hooks/use-palette-theme"
import {
  EMPTY_DECISION_CONFIGURATION,
  EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION,
  EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS,
  EMPTY_EXTERNAL_PROVIDER_STATUS,
  type DecisionConfiguration,
  type EyeMovementAnalysisConfiguration,
  type EyeMovementAnalysisProviderStatusSnapshot,
  type ExternalProviderStatusSnapshot,
  type SensingMode,
} from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { getErrorMessage, getErrorStatus } from "@/lib/error-utils"
import { mapExperimentSetupItemsToSequenceItems } from "@/lib/experiment-sequence"
import {
  hydrateExperimentFromSession,
  setReadingSessionExperimentSelection,
  setReadingSessionSource,
  setReadingSessionCustomMarkdown,
  setReadingSessionResearcherQuestions,
  setReadingSessionTitle,
  setStepTwoAge,
  setStepTwoEyeCondition,
  setStepTwoLastSyncedFingerprint,
  setStepTwoName,
  setStepTwoReadingProficiency,
  setStepTwoSex,
  useAppDispatch,
  useAppSelector,
  useGetExperimentSessionQuery,
  useGetExperimentSetupsQuery,
  useLazyGetExperimentSetupByIdQuery,
  useSaveParticipantMutation,
  useStartExperimentSessionMutation,
  useUpdateDecisionConfigurationMutation,
  useUpdateEyeMovementAnalysisConfigurationMutation,
  useUpdateExperimentSetupTestingOverridesMutation,
  useUpsertReadingSessionMutation,
} from "@/redux"
import type { RootState } from "@/redux"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  applyReadingPresentationSettings,
  useReadingSettings,
} from "@/modules/pages/reading/lib/useReadingSettings"
import { MOCK_READING_MD } from "@/modules/pages/reading/content/mockReading"
import { EyetrackerSetup } from "./eyetracker-setup"
import { CalibrationStep } from "./calibration-step"
import {
  EMPTY_EXPERIMENT_SETUP,
  getAuthoritativeWorkflowStepStates,
  type AuthoritativeWorkflowStepState,
} from "./utils"
import { experimentStepperTestingOverrides } from "./experiment-stepper-testing"

export type ExperimentStepperMode = "researcher" | "participant"
const PARTICIPANT_CALIBRATION_RERUN_REQUEST_KEY = "participant-calibration-rerun-request"
const PARTICIPANT_CALIBRATION_RERUN_HANDLED_KEY = "participant-calibration-rerun-handled"
const PARTICIPANT_FLOW_STARTED_KEY = "participant-flow-started-v2"

export type ExperimentStep = {
  value: number
  name: string
  label: string
  owner: "Researcher" | "Participant"
  description: string
  icon: LucideIcon
}

type ExperimentStepNavigationProps = {
  step: number
  onStepChange: (value: number) => void
  stepStates: AuthoritativeWorkflowStepState[]
  steps: ExperimentStep[]
  mode: ExperimentStepperMode
  selectableSteps: number[]
}

export function ExperimentStepNavigation({
  step,
  onStepChange,
  stepStates,
  steps,
  mode,
  selectableSteps,
}: ExperimentStepNavigationProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Experiment flow</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {mode === "researcher"
            ? "Researcher preparation first, participant setup second."
            : "Follow the remaining participant steps once the researcher preparation is complete."}
        </h2>
      </div>
      {steps.map((stepItem) => {
        const Icon = stepItem.icon
        const stepState = stepStates[stepItem.value]
        const isActive = step === stepItem.value
        const isCompleted = Boolean(stepState?.isReady)
        const isLocked = !(stepState?.isAvailable ?? stepItem.value === 0) && !isCompleted
        const isReadOnly = !isLocked && !selectableSteps.includes(stepItem.value)
        const isSelectable = !isLocked && selectableSteps.includes(stepItem.value)
        const stepStatus = isCompleted
          ? "Done"
          : isActive
            ? "Current"
            : isLocked
              ? "Locked"
              : "Available"

        return (
          <button
            key={stepItem.value}
            type="button"
            disabled={!isSelectable}
            onClick={() => {
              if (isSelectable) {
                onStepChange(stepItem.value)
              }
            }}
            className={cn(
              "w-full rounded-[1.5rem] border p-4 text-left transition-all",
              isActive && "border-primary bg-primary/5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]",
              isCompleted && "border-emerald-300/60 bg-emerald-500/5",
              !isActive && !isCompleted && "bg-card hover:border-primary/40 hover:bg-primary/5",
              isLocked && "cursor-not-allowed opacity-55 hover:border-border hover:bg-card"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                      : "border-neutral-300 bg-neutral-100 text-neutral-500"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{stepItem.label}</p>
                  <Badge variant="outline">{stepItem.owner}</Badge>
                  {isReadOnly ? <Badge variant="outline">Read only</Badge> : null}
                  <Badge variant={isCompleted ? "secondary" : "outline"}>{stepStatus}</Badge>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {stepItem.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{stepItem.description}</p>
                <p className="mt-2 text-sm font-medium text-foreground/80">{stepState?.summary}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const steps: ExperimentStep[] = [
  {
    value: 0,
    name: "step1",
    label: "Choose eyetracker",
    owner: "Researcher",
    description: "Select the device and its licence so the session can talk to the tracker.",
    icon: Crosshair,
  },
  {
    value: 1,
    name: "step2",
    label: "Reading material",
    owner: "Researcher",
    description: "Choose the text, apply the baseline, and confirm runtime plugins.",
    icon: BookOpen,
  },
  {
    value: 2,
    name: "step3",
    label: "Participant info",
    owner: "Participant",
    description: "Record the participant details after researcher preparation is complete.",
    icon: FileText,
  },
  {
    value: 3,
    name: "step4",
    label: "Calibration",
    owner: "Participant",
    description: "Open the calibration page, complete it, and come back here when it is done.",
    icon: ScanEye,
  },
]

const participantSexOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
]

const participantEyeConditionOptions = [
  { value: "none", label: "None" },
  { value: "myopia", label: "Myopia" },
  { value: "hyperopia", label: "Hyperopia" },
  { value: "astigmatism", label: "Astigmatism" },
  { value: "color-vision-deficiency", label: "Color vision deficiency" },
]

const participantReadingProficiencyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const DECISION_CONDITION_OPTIONS = [
  {
    label: "Manual control",
    providerId: "manual",
    executionMode: "advisory",
    pluginLabel: "No decision plugin",
    description: "Interventions stay researcher-operated.",
  },
  {
    label: "Rule-based advisory",
    providerId: "rule-based",
    executionMode: "advisory",
    pluginLabel: "Built-in plugin",
    description: "Backend rules can propose interventions for review.",
  },
  {
    label: "Rule-based autonomous",
    providerId: "rule-based",
    executionMode: "autonomous",
    pluginLabel: "Built-in plugin",
    description: "Backend rules can apply supported interventions.",
  },
  {
    label: "Decision-maker advisory",
    providerId: "external",
    executionMode: "advisory",
    pluginLabel: "External plugin",
    description: "Use the connected decision-maker service for proposals.",
  },
  {
    label: "Decision-maker autonomous",
    providerId: "external",
    executionMode: "autonomous",
    pluginLabel: "External plugin",
    description: "Use the connected decision-maker service for automatic intervention requests.",
  },
] as const

type DecisionConditionOption = (typeof DECISION_CONDITION_OPTIONS)[number]

const EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS = [
  {
    label: "Built-in analyzer",
    providerId: "builtin",
    pluginLabel: "Built-in plugin",
    description: "Backend thresholds provide fixation and saccade state.",
  },
  {
    label: "Eye analyzer service",
    providerId: "external",
    pluginLabel: "External plugin",
    description: "Use the connected analyzer service for fixation and saccade state.",
  },
] as const

function resolveConditionOption(
  providerId?: string | null,
  executionMode?: string | null
) {
  return (
    DECISION_CONDITION_OPTIONS.find(
      (option) =>
        option.providerId === providerId &&
        option.executionMode === executionMode
    ) ?? DECISION_CONDITION_OPTIONS[0]
  )
}

function isExternalConditionAvailable(
  option: DecisionConditionOption,
  externalProviderStatus: ExternalProviderStatusSnapshot
) {
  if (option.providerId !== "external") {
    return true
  }

  if (!externalProviderStatus.isConnected) {
    return false
  }

  return option.executionMode === "autonomous"
    ? externalProviderStatus.supportsAutonomousExecution
    : externalProviderStatus.supportsAdvisoryExecution
}

function getAvailableDecisionConditionOptions(
  externalProviderStatus: ExternalProviderStatusSnapshot
) {
  return DECISION_CONDITION_OPTIONS.filter((option) =>
    isExternalConditionAvailable(option, externalProviderStatus)
  )
}

type PluginStatusPanelProps = {
  eyebrow: string
  title: string
  badge: string
  tone: "connected" | "offline" | "unavailable" | "builtin"
  description: string
  details?: string[]
}

function PluginStatusPanel({
  eyebrow,
  title,
  badge,
  tone,
  description,
  details = [],
}: PluginStatusPanelProps) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border-2 px-5 py-4 shadow-sm",
        tone === "connected" &&
          "border-emerald-500/70 bg-emerald-500/10 shadow-[0_12px_32px_rgba(16,185,129,0.14)]",
        tone === "unavailable" &&
          "border-rose-500/70 bg-rose-500/10 shadow-[0_12px_32px_rgba(244,63,94,0.14)]",
        tone === "offline" &&
          "border-amber-500/70 bg-amber-500/10 shadow-[0_12px_32px_rgba(245,158,11,0.14)]",
        tone === "builtin" &&
          "border-sky-500/60 bg-sky-500/10 shadow-[0_12px_32px_rgba(14,165,233,0.12)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        </div>
        <Badge
          className={cn(
            "border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
            tone === "connected" && "border-emerald-600/30 bg-emerald-600 text-white",
            tone === "unavailable" && "border-rose-600/30 bg-rose-600 text-white",
            tone === "offline" && "border-amber-600/30 bg-amber-500 text-amber-950",
            tone === "builtin" && "border-sky-600/30 bg-sky-600 text-white"
          )}
        >
          {badge}
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground/85">{description}</p>
      {details.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {details.map((detail) => (
            <Badge key={detail} variant="outline" className="bg-background/70">
              {detail}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MouseModeSetupStep({
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: {
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  React.useEffect(() => {
    onCompletionChange?.(true)
  }, [onCompletionChange])

  React.useEffect(() => {
    onSubmitRequestChange?.(null)
    return () => onSubmitRequestChange?.(null)
  }, [onSubmitRequestChange])

  React.useEffect(() => {
    onSubmittingChange?.(false)
    return () => onSubmittingChange?.(false)
  }, [onSubmittingChange])

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Step 1</Badge>
          <Badge variant="outline">Mouse mode</Badge>
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">Mouse input is active.</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          The setup flow will skip eyetracker selection, licence upload, and hardware checks.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 rounded-[1.5rem] border bg-muted/20 p-4">
          <MousePointer2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Ready for demo input</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Start the participant view and move the mouse over the reading area to send synthetic
              gaze samples.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type RuntimePluginOptionButtonProps = {
  label: string
  pluginLabel: string
  meta: string
  description: string
  isSelected: boolean
  isUnavailable?: boolean
  disabled?: boolean
  unavailableMessage: string
  onClick: () => void
}

function RuntimePluginOptionButton({
  label,
  pluginLabel,
  meta,
  description,
  isSelected,
  isUnavailable = false,
  disabled = false,
  unavailableMessage,
  onClick,
}: RuntimePluginOptionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isUnavailable}
      onClick={() => {
        if (!isUnavailable) {
          onClick()
        }
      }}
      className={cn(
        "w-full rounded-2xl border p-5 text-left transition-colors",
        "bg-card hover:border-primary/40 hover:bg-accent/30",
        isSelected && "border-primary bg-accent/50",
        isUnavailable &&
          "cursor-not-allowed border-amber-500/40 bg-amber-500/5 text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/5"
      )}
    >
      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{label}</p>
            <Badge variant={isSelected ? "secondary" : "outline"}>{pluginLabel}</Badge>
            {isUnavailable ? <Badge variant="outline">Unavailable</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          {isUnavailable ? (
            <p className="mt-2 text-xs text-amber-700">{unavailableMessage}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

const participantFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  age: z
    .number({ error: "Age is required." })
    .int("Age must be a whole number.")
    .min(5, "Age must be at least 5.")
    .max(120, "Age must be at most 120."),
  sex: z.string().min(1, "Please select sex."),
  eyeCondition: z.string().min(1, "Please select an eye condition."),
  readingProficiency: z.string().min(1, "Please select a reading proficiency level."),
})

type ParticipantInformationFormProps = {
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}

function ParticipantInformationForm({
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: ParticipantInformationFormProps) {
  const dispatch = useAppDispatch()
  const stepTwoDraft = useAppSelector((state: RootState) => state.experiment.stepTwo)
  const [saveParticipant, { isLoading: isSavingParticipant }] = useSaveParticipantMutation()

  const form = useForm<z.infer<typeof participantFormSchema>>({
    resolver: zodResolver(participantFormSchema),
    mode: "onChange",
    defaultValues: {
      name: stepTwoDraft.name,
      age: stepTwoDraft.age,
      sex: stepTwoDraft.sex,
      eyeCondition: stepTwoDraft.eyeCondition,
      readingProficiency: stepTwoDraft.readingProficiency,
    },
  })

  const watchedName = useWatch({ control: form.control, name: "name" })
  const watchedAge = useWatch({ control: form.control, name: "age" })
  const watchedSex = useWatch({ control: form.control, name: "sex" })
  const watchedEyeCondition = useWatch({ control: form.control, name: "eyeCondition" })
  const watchedReadingProficiency = useWatch({
    control: form.control,
    name: "readingProficiency",
  })

  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const lastAppliedSyncedFingerprintRef = React.useRef<string | null>(null)

  const isComplete = participantFormSchema.safeParse({
    name: watchedName,
    age: watchedAge,
    sex: watchedSex,
    eyeCondition: watchedEyeCondition,
    readingProficiency: watchedReadingProficiency,
  }).success

  React.useEffect(() => {
    dispatch(setStepTwoName(watchedName ?? ""))
  }, [dispatch, watchedName])

  React.useEffect(() => {
    dispatch(setStepTwoAge(Number(watchedAge) || 0))
  }, [dispatch, watchedAge])

  React.useEffect(() => {
    dispatch(setStepTwoSex(watchedSex ?? ""))
  }, [dispatch, watchedSex])

  React.useEffect(() => {
    dispatch(setStepTwoEyeCondition(watchedEyeCondition ?? ""))
  }, [dispatch, watchedEyeCondition])

  React.useEffect(() => {
    dispatch(setStepTwoReadingProficiency(watchedReadingProficiency ?? ""))
  }, [dispatch, watchedReadingProficiency])

  React.useEffect(() => {
    const syncedFingerprint = stepTwoDraft.lastSyncedFingerprint
    if (!syncedFingerprint || lastAppliedSyncedFingerprintRef.current === syncedFingerprint) {
      return
    }

    form.reset({
      name: stepTwoDraft.name,
      age: stepTwoDraft.age,
      sex: stepTwoDraft.sex,
      eyeCondition: stepTwoDraft.eyeCondition,
      readingProficiency: stepTwoDraft.readingProficiency,
    })
    lastAppliedSyncedFingerprintRef.current = syncedFingerprint
  }, [
    form,
    stepTwoDraft.age,
    stepTwoDraft.eyeCondition,
    stepTwoDraft.lastSyncedFingerprint,
    stepTwoDraft.name,
    stepTwoDraft.readingProficiency,
    stepTwoDraft.sex,
  ])

  const submitParticipantForm = React.useCallback(async () => {
    setSubmitError(null)

    const isValid = await form.trigger()
    if (!isValid) {
      return false
    }

    const data = form.getValues()
    const currentFingerprint = JSON.stringify({
      name: data.name,
      age: data.age,
      sex: data.sex,
      eyeCondition: data.eyeCondition,
      readingProficiency: data.readingProficiency,
    })

    if (stepTwoDraft.lastSyncedFingerprint === currentFingerprint) {
      return true
    }

    try {
      await saveParticipant({
        name: data.name,
        age: data.age,
        sex: data.sex,
        existingEyeCondition: data.eyeCondition,
        readingProficiency: data.readingProficiency,
      }).unwrap()
      dispatch(setStepTwoLastSyncedFingerprint(currentFingerprint))
      lastAppliedSyncedFingerprintRef.current = currentFingerprint
      return true
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to save participant. Please try again."))
      return false
    }
  }, [dispatch, form, saveParticipant, stepTwoDraft.lastSyncedFingerprint])

  React.useEffect(() => {
    onCompletionChange?.(isComplete)
  }, [isComplete, onCompletionChange])

  React.useEffect(() => {
    onSubmittingChange?.(isSavingParticipant)
    return () => onSubmittingChange?.(false)
  }, [isSavingParticipant, onSubmittingChange])

  React.useEffect(() => {
    onSubmitRequestChange?.(submitParticipantForm)
    return () => onSubmitRequestChange?.(null)
  }, [onSubmitRequestChange, submitParticipantForm])

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Step 3</Badge>
          <Badge variant="outline">Participant</Badge>
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">Capture participant information.</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          Record the participant details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <form id="participant-info-form" onSubmit={(event) => event.preventDefault()}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="participant-name"
                    placeholder="Enter participant name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="age"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-age">Age</FieldLabel>
                  <Input
                    id="participant-age"
                    type="number"
                    min={5}
                    max={120}
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="sex"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-sex">Sex</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="participant-sex" className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantSexOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="eyeCondition"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-eye-condition">Existing eye condition</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="participant-eye-condition"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select eye condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantEyeConditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="readingProficiency"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-reading-proficiency">Reading proficiency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="participant-reading-proficiency"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select reading proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantReadingProficiencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Choose the participant&apos;s reading level for baseline grouping.
                  </FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not continue</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

type SessionContentStepProps = {
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  saveReadingSessionDraft?: () => Promise<boolean>
  currentDecisionConfiguration?: DecisionConfiguration
  currentEyeMovementAnalysisConfiguration?: EyeMovementAnalysisConfiguration
  externalProviderStatus?: ExternalProviderStatusSnapshot
  eyeMovementAnalysisProviderStatus?: EyeMovementAnalysisProviderStatusSnapshot
  automationPaused?: boolean
}

function SessionContentStep({
  onCompletionChange,
  onSubmitRequestChange,
  saveReadingSessionDraft,
  currentDecisionConfiguration = EMPTY_DECISION_CONFIGURATION,
  currentEyeMovementAnalysisConfiguration = EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION,
  externalProviderStatus = EMPTY_EXTERNAL_PROVIDER_STATUS,
  eyeMovementAnalysisProviderStatus = EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS,
  automationPaused = false,
}: SessionContentStepProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const readingSession = useAppSelector((state: RootState) => state.experiment.readingSession)
  const { data: experimentSetups = [], isLoading: isLoadingExperimentSetups, refetch } =
    useGetExperimentSetupsQuery()
  const [getExperimentSetupById, { isFetching: isLoadingSelectedExperiment }] =
    useLazyGetExperimentSetupByIdQuery()
  const [updateDecisionConfiguration, { isLoading: isSavingDecisionConfiguration }] =
    useUpdateDecisionConfigurationMutation()
  const [updateEyeMovementAnalysisConfiguration, { isLoading: isSavingAnalysisConfiguration }] =
    useUpdateEyeMovementAnalysisConfigurationMutation()
  const { resetReadingSettings } = useReadingSettings()

  const [selectionError, setSelectionError] = React.useState<string | null>(null)
  const [selectedDecisionCondition, setSelectedDecisionCondition] = React.useState<
    Pick<DecisionConfiguration, "providerId" | "executionMode">
  >({
    providerId: currentDecisionConfiguration.providerId,
    executionMode: currentDecisionConfiguration.executionMode,
  })
  const [selectedAnalysisProviderId, setSelectedAnalysisProviderId] = React.useState(
    currentEyeMovementAnalysisConfiguration.providerId
  )
  const hasSelectedMaterial = readingSession.title.trim().length > 0
  const selectedExperimentSetup = React.useMemo(
    () =>
      experimentSetups.find((setup) => setup.id === readingSession.selectedExperimentSetupId) ??
      null,
    [experimentSetups, readingSession.selectedExperimentSetupId]
  )
  const selectedPresentationLabel =
    readingSession.source === "preset"
      ? "Default presentation"
      : readingSession.source === "experiment"
        ? selectedExperimentSetup?.name ?? "Reusable experiment"
        : "Custom presentation"
  const localReadingBaselineLabel =
    readingSession.source === "preset"
      ? "Built-in baseline"
      : readingSession.source === "experiment"
        ? "Reusable experiment"
        : "Local draft"
  const selectedExperimentItem = selectedExperimentSetup?.items.find(
    (item) => item.id === readingSession.selectedExperimentSetupItemId
  )
  const localControlLabel = selectedExperimentItem
    ? selectedExperimentItem.editableByExperimenter
      ? "Live-adjustable"
      : "Locked"
    : readingSession.source === "preset"
      ? "Live-adjustable"
      : "Local draft"
  const availableDecisionOptions = React.useMemo(
    () => getAvailableDecisionConditionOptions(externalProviderStatus),
    [externalProviderStatus]
  )
  const selectedConditionOption = React.useMemo(
    () =>
      resolveConditionOption(
        selectedDecisionCondition.providerId,
        selectedDecisionCondition.executionMode
      ),
    [selectedDecisionCondition.executionMode, selectedDecisionCondition.providerId]
  )
  const selectedConditionLabel = selectedConditionOption.label
  const isSelectedConditionUnavailable =
    selectedConditionOption.providerId === "external" &&
    !isExternalConditionAvailable(selectedConditionOption, externalProviderStatus)
  const visibleDecisionOptions = React.useMemo(() => {
    if (!isSelectedConditionUnavailable) {
      return availableDecisionOptions
    }

    return [...availableDecisionOptions, selectedConditionOption]
  }, [availableDecisionOptions, isSelectedConditionUnavailable, selectedConditionOption])
  const connectedExternalModes = [
    externalProviderStatus.supportsAdvisoryExecution ? "advisory" : null,
    externalProviderStatus.supportsAutonomousExecution ? "autonomous" : null,
  ].filter(Boolean) as string[]
  const decisionPluginName =
    externalProviderStatus.displayName ?? externalProviderStatus.providerId ?? "Decision-maker service"
  const eyeAnalyzerPluginName =
    eyeMovementAnalysisProviderStatus.displayName ??
    eyeMovementAnalysisProviderStatus.providerId ??
    "Eye analyzer service"
  const isSelectedAnalysisPluginUnavailable =
    selectedAnalysisProviderId === "external" && !eyeMovementAnalysisProviderStatus.isConnected
  const selectedAnalysisPluginLabel =
    selectedAnalysisProviderId === "external" ? "Eye analyzer service" : "Built-in analyzer"

  React.useEffect(() => {
    onCompletionChange?.(hasSelectedMaterial)
  }, [hasSelectedMaterial, onCompletionChange])

  React.useEffect(() => {
    setSelectedDecisionCondition({
      providerId: currentDecisionConfiguration.providerId,
      executionMode: currentDecisionConfiguration.executionMode,
    })
  }, [currentDecisionConfiguration.executionMode, currentDecisionConfiguration.providerId])

  React.useEffect(() => {
    setSelectedAnalysisProviderId(currentEyeMovementAnalysisConfiguration.providerId)
  }, [currentEyeMovementAnalysisConfiguration.providerId])

  React.useEffect(() => {
    onSubmitRequestChange?.(saveReadingSessionDraft ?? null)
    return () => onSubmitRequestChange?.(null)
  }, [onSubmitRequestChange, saveReadingSessionDraft])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 2</Badge>
            <Badge variant="outline">Researcher</Badge>
            <Badge variant="outline">Experiment baseline</Badge>
          </div>
          <CardTitle className="mt-3 text-3xl tracking-tight">Choose a reusable experiment and runtime plugins.</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Pick the reusable experiment, apply its first text as the live reading baseline, and confirm the runtime plugins before handing over to the participant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {selectionError ? (
            <Alert variant="destructive">
              <AlertTitle>Selection issue</AlertTitle>
              <AlertDescription>{selectionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                resetReadingSettings()
                dispatch(setReadingSessionSource("preset"))
                dispatch(setReadingSessionTitle("Reading as Deliberate Attention"))
                dispatch(setReadingSessionCustomMarkdown(""))
                dispatch(setReadingSessionResearcherQuestions(""))
                dispatch(
                  setReadingSessionExperimentSelection({
                    experimentSetupId: null,
                    experimentSetupName: null,
                    experimentSetupItemId: null,
                    readingMaterialSetupId: null,
                    itemCount: 0,
                  })
                )
              }}
              className={cn(
                "w-full rounded-2xl border p-5 text-left transition-colors",
                "bg-card hover:border-primary/40 hover:bg-accent/30",
                readingSession.source === "preset" && "border-primary bg-accent/50"
              )}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold">Default text</p>
                  <p className="text-xs text-muted-foreground">Reading as Deliberate Attention</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Built-in fallback
                </div>
              </div>
            </button>

            {experimentSetups.map((setup) => (
              <button
                key={setup.id}
                type="button"
                onClick={async () => {
                  setSelectionError(null)

                  try {
                    const savedSetup = await getExperimentSetupById(setup.id).unwrap()
                    const firstItem = savedSetup.items[0]
                    if (!firstItem) {
                      setSelectionError("That experiment does not contain any reading materials yet.")
                      return
                    }

                    dispatch(setReadingSessionSource("experiment"))
                    dispatch(setReadingSessionTitle(firstItem.title))
                    dispatch(setReadingSessionCustomMarkdown(firstItem.markdown))
                    dispatch(setReadingSessionResearcherQuestions(firstItem.researcherQuestions))
                    dispatch(
                      setReadingSessionExperimentSelection({
                        experimentSetupId: savedSetup.id,
                        experimentSetupName: savedSetup.name,
                        experimentSetupItemId: firstItem.id,
                        readingMaterialSetupId: firstItem.sourceReadingMaterialSetupId,
                        itemCount: savedSetup.items.length,
                      })
                    )
                    applyReadingPresentationSettings({
                      id: firstItem.sourceReadingMaterialSetupId ?? firstItem.id,
                      name: firstItem.title,
                      fontFamily: firstItem.fontFamily,
                      fontSizePx: firstItem.fontSizePx,
                      lineWidthPx: firstItem.lineWidthPx,
                      lineHeight: firstItem.lineHeight,
                      letterSpacingEm: firstItem.letterSpacingEm,
                      editableByExperimenter: firstItem.editableByExperimenter,
                    })
                  } catch (error) {
                    if (getErrorStatus(error) === 404) {
                      setSelectionError("That saved experiment no longer exists.")
                      void refetch()
                      return
                    }

                    setSelectionError(
                      getErrorMessage(error, "Could not load that experiment setup.")
                    )
                  }
                }}
                disabled={isLoadingSelectedExperiment}
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-colors",
                  "bg-card hover:border-primary/40 hover:bg-accent/30",
                  readingSession.selectedExperimentSetupId === setup.id && "border-primary bg-accent/50"
                )}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-base font-semibold">{setup.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {setup.items.length} texts in sequence
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    Reusable experiment
                  </div>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => router.push("/experiment/setups")}
              disabled={isLoadingExperimentSetups}
              className="flex min-h-[170px] w-full flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <Plus className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-base font-semibold">Create experiment</p>
            </button>
          </div>

          {readingSession.source === "experiment" && selectedExperimentSetup ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Selected experiment sequence</CardTitle>
                <CardDescription>
                  This experiment contains {selectedExperimentSetup.items.length} text
                  {selectedExperimentSetup.items.length === 1 ? "" : "s"}. The first one below is the
                  current live baseline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedExperimentSetup.items.map((item, index) => {
                  const isCurrent = item.id === readingSession.selectedExperimentSetupItemId

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-2xl border p-4",
                        isCurrent ? "border-primary bg-primary/5" : "bg-muted/20"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isCurrent ? "secondary" : "outline"}>
                          Text {index + 1}
                        </Badge>
                        {isCurrent ? <Badge variant="outline">Current baseline</Badge> : null}
                        <Badge variant="outline">
                          {item.editableByExperimenter ? "Live-adjustable" : "Locked"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source: {item.sourceReadingMaterialTitle}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.fontFamily} | {item.fontSizePx}px | {item.lineWidthPx}px | line
                        height {item.lineHeight.toFixed(2)}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold">Runtime plugins</p>
              <p className="text-sm text-muted-foreground">
                Choose the decision and eye movement analysis plugins for this session.
              </p>
            </div>

            <PluginStatusPanel
              eyebrow="Decision plugin"
              title={
                externalProviderStatus.isConnected
                  ? `${decisionPluginName} connected`
                  : isSelectedConditionUnavailable
                    ? "Selected decision plugin unavailable"
                    : "Built-in decision flow active"
              }
              badge={
                externalProviderStatus.isConnected
                  ? "Connected"
                  : isSelectedConditionUnavailable
                    ? "Unavailable"
                    : "Built-in"
              }
              tone={
                externalProviderStatus.isConnected
                  ? "connected"
                  : isSelectedConditionUnavailable
                    ? "unavailable"
                    : "builtin"
              }
              description={
                externalProviderStatus.isConnected
                  ? connectedExternalModes.length > 0
                    ? `The external decision-maker is available for ${connectedExternalModes.join(" and ")} execution.`
                    : "The external decision-maker is connected but does not advertise execution support."
                  : isSelectedConditionUnavailable
                    ? "Reconnect the decision-maker service or switch to a built-in decision plugin before relying on automation."
                    : "External decision plugins become selectable when a decision-maker service connects."
              }
              details={[
                `Selected: ${selectedConditionLabel}`,
                externalProviderStatus.providerId
                  ? `Provider: ${externalProviderStatus.providerId}`
                  : "Provider: built-in",
              ]}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDecisionOptions.map((option) => {
                const isSelected =
                  selectedDecisionCondition.providerId === option.providerId &&
                  selectedDecisionCondition.executionMode === option.executionMode
                const isUnavailable =
                  option.providerId === "external" &&
                  !isExternalConditionAvailable(option, externalProviderStatus)

                return (
                  <button
                    key={option.label}
                    type="button"
                    disabled={isSavingDecisionConfiguration || isUnavailable}
                    onClick={async () => {
                      if (isUnavailable) {
                        return
                      }

                      setSelectionError(null)

                      try {
                        await updateDecisionConfiguration({
                          conditionLabel: option.label,
                          providerId: option.providerId,
                          executionMode: option.executionMode,
                          automationPaused,
                        }).unwrap()
                        setSelectedDecisionCondition({
                          providerId: option.providerId,
                          executionMode: option.executionMode,
                        })
                      } catch (error) {
                        setSelectionError(
                          getErrorMessage(error, "Could not update the experiment condition.")
                        )
                      }
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-5 text-left transition-colors",
                      "bg-card hover:border-primary/40 hover:bg-accent/30",
                      isSelected && "border-primary bg-accent/50",
                      isUnavailable &&
                        "cursor-not-allowed border-amber-500/40 bg-amber-500/5 text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/5"
                    )}
                  >
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">{option.label}</p>
                        <Badge variant={isSelected ? "secondary" : "outline"}>
                          {option.pluginLabel}
                        </Badge>
                        {isUnavailable ? <Badge variant="outline">Unavailable</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.providerId} · {option.executionMode}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{option.description}</p>
                      {isUnavailable ? (
                        <p className="mt-2 text-xs text-amber-700">
                          Start the decision-maker service before choosing this plugin.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Eye analyzer plugin</p>
              <p className="text-sm text-muted-foreground">
                Choose which plugin owns fixation and saccade analysis.
              </p>
            </div>

            <PluginStatusPanel
              eyebrow="Eye analyzer plugin"
              title={
                eyeMovementAnalysisProviderStatus.isConnected
                  ? `${eyeAnalyzerPluginName} connected`
                  : isSelectedAnalysisPluginUnavailable
                    ? "Selected eye analyzer unavailable"
                    : "Built-in analyzer active"
              }
              badge={
                eyeMovementAnalysisProviderStatus.isConnected
                  ? "Connected"
                  : isSelectedAnalysisPluginUnavailable
                    ? "Unavailable"
                    : "Built-in"
              }
              tone={
                eyeMovementAnalysisProviderStatus.isConnected
                  ? "connected"
                  : isSelectedAnalysisPluginUnavailable
                    ? "unavailable"
                    : "builtin"
              }
              description={
                eyeMovementAnalysisProviderStatus.isConnected
                  ? "The external analyzer can provide backend-owned fixation and saccade state for this session."
                  : isSelectedAnalysisPluginUnavailable
                    ? "Reconnect the analyzer service or switch to the built-in analyzer before starting the session."
                    : "The built-in analyzer remains the authoritative fixation and saccade source until an external analyzer is selected."
              }
              details={[
                `Selected: ${selectedAnalysisPluginLabel}`,
                eyeMovementAnalysisProviderStatus.providerId
                  ? `Provider: ${eyeMovementAnalysisProviderStatus.providerId}`
                  : "Provider: built-in",
              ]}
            />

            <div className="grid gap-4 md:grid-cols-2">
              {EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS.map((option) => {
                const isSelected = selectedAnalysisProviderId === option.providerId
                const isUnavailable =
                  option.providerId === "external" &&
                  !eyeMovementAnalysisProviderStatus.isConnected

                return (
                  <RuntimePluginOptionButton
                    key={option.providerId}
                    label={option.label}
                    pluginLabel={option.pluginLabel}
                    meta={option.providerId}
                    description={
                      option.providerId === "external" &&
                      eyeMovementAnalysisProviderStatus.isConnected
                        ? `Use ${eyeAnalyzerPluginName} for fixation and saccade state.`
                        : option.description
                    }
                    isSelected={isSelected}
                    isUnavailable={isUnavailable}
                    disabled={isSavingAnalysisConfiguration}
                    unavailableMessage="Start the eye analyzer service before choosing this plugin."
                    onClick={async () => {
                      setSelectionError(null)

                      try {
                        await updateEyeMovementAnalysisConfiguration({
                          providerId: option.providerId,
                        }).unwrap()
                        setSelectedAnalysisProviderId(option.providerId)
                      } catch (error) {
                        setSelectionError(
                          getErrorMessage(error, "Could not update eye movement analysis.")
                        )
                      }
                    }}
                  />
                )
              })}
            </div>
          </div>

          {hasSelectedMaterial ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{readingSession.title}</span>
              {" | "}
              <span className="font-medium text-foreground">
                {selectedPresentationLabel} | {selectedConditionLabel}
              </span>
              {" | "}
              <span className="font-medium text-foreground">
                {localReadingBaselineLabel} | {localControlLabel}
              </span>
              {readingSession.source === "experiment" && readingSession.selectedExperimentSetupName ? (
                <>
                  {" | "}
                  <span className="font-medium text-foreground">
                    {readingSession.selectedExperimentSetupName}
                    {readingSession.selectedExperimentItemCount > 0
                      ? ` (${readingSession.selectedExperimentItemCount} texts)`
                      : ""}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

type ExperimentStepperProps = {
  mode?: ExperimentStepperMode
}

export function ExperimentStepper({ mode = "researcher" }: ExperimentStepperProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { resolvedTheme } = useTheme()
  const { font } = useFontTheme()
  const { palette } = usePaletteTheme()
  const {
    forceEyeTrackerReady,
    forceParticipantReady,
    forceCalibrationReady,
    forceReadingMaterialReady,
  } = experimentStepperTestingOverrides
  const readingSession = useAppSelector((state: RootState) => state.experiment.readingSession)
  const { presentation } = useReadingSettings()
  const isParticipantMode = mode === "participant"
  const { data: experimentSession } = useGetExperimentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 3_000,
  })
  const { data: experimentSetups = [] } = useGetExperimentSetupsQuery()
  const [upsertReadingSession, { isLoading: isSavingReadingSession }] =
    useUpsertReadingSessionMutation()
  const [startExperimentSession, { isLoading: isStartingExperimentSession }] =
    useStartExperimentSessionMutation()
  const [updateExperimentSetupTestingOverrides] =
    useUpdateExperimentSetupTestingOverridesMutation()
  const [step, setStep] = React.useState(0)
  const [isStepSubmitting, setIsStepSubmitting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)
  const [participantRerunNotice, setParticipantRerunNotice] = React.useState<string | null>(null)
  const [participantFlowStarted, setParticipantFlowStarted] = React.useState(false)
  const [stepCompletion, setStepCompletion] = React.useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
  })
  const stepSubmitHandlerRef = React.useRef<(() => Promise<boolean>) | null>(null)

  const setup = experimentSession?.setup ?? EMPTY_EXPERIMENT_SETUP
  const sensingMode: SensingMode = experimentSession?.sensingMode ?? "eyeTracker"
  const workflowStepStates = React.useMemo(
    () => getAuthoritativeWorkflowStepStates(setup, sensingMode),
    [setup, sensingMode]
  )
  const backendResearcherSetupStarted =
    setup.eyeTracker.hasSelectedEyeTracker ||
    setup.eyeTracker.hasAppliedLicence ||
    setup.eyeTracker.isReady ||
    setup.readingMaterial.hasReadingMaterial ||
    setup.readingMaterial.isReady ||
    setup.participant.hasParticipant ||
    setup.calibration.hasCalibrationSession
  const hasResearcherStartedSetup =
    participantFlowStarted || backendResearcherSetupStarted
  const researcherPreparationReady =
    (workflowStepStates[0]?.isReady ?? false) && (workflowStepStates[1]?.isReady ?? false)
  const firstIncompleteStepIndex = workflowStepStates.findIndex((state) => !state.isReady)
  const firstParticipantIncompleteStepIndex = workflowStepStates.findIndex(
    (state) => state.index >= 2 && !state.isReady
  )
  const readingTitle =
    readingSession.title.trim().length > 0
      ? readingSession.title.trim()
      : "Reading as Deliberate Attention"
  const readingDocumentId =
    readingSession.source === "experiment" &&
    readingSession.selectedExperimentSetupId &&
    readingSession.selectedExperimentSetupItemId
      ? `${readingSession.selectedExperimentSetupId}:${readingSession.selectedExperimentSetupItemId}`
      : readingSession.source === "custom" && readingSession.selectedReadingMaterialSetupId
        ? readingSession.selectedReadingMaterialSetupId
      : "mock-reading-v1"
  const readingSourceSetupId =
    readingSession.source === "experiment"
      ? readingSession.selectedReadingMaterialSetupId
      : readingSession.source === "custom"
        ? readingSession.selectedReadingMaterialSetupId
        : null
  const readingExperimentSetupId =
    readingSession.source === "experiment" ? readingSession.selectedExperimentSetupId : null
  const readingExperimentSetupItemId =
    readingSession.source === "experiment" ? readingSession.selectedExperimentSetupItemId : null
  const selectedExperimentSetup = React.useMemo(
    () =>
      experimentSetups.find((setup) => setup.id === readingSession.selectedExperimentSetupId) ??
      null,
    [experimentSetups, readingSession.selectedExperimentSetupId]
  )
  const readingExperimentItems =
    readingSession.source === "experiment" && selectedExperimentSetup
      ? mapExperimentSetupItemsToSequenceItems(selectedExperimentSetup.items)
      : undefined
  const readingCurrentExperimentItemIndex =
    readingSession.source === "experiment" && selectedExperimentSetup
      ? Math.max(
          0,
          selectedExperimentSetup.items.findIndex(
            (item) => item.id === readingSession.selectedExperimentSetupItemId
          )
        )
      : undefined
  const hasLocalReadingSelection = readingSession.title.trim().length > 0
  const hasUnsavedReadingDraft =
    hasLocalReadingSelection &&
    (setup.readingMaterial.documentId !== readingDocumentId ||
      setup.readingMaterial.sourceSetupId !== readingSourceSetupId ||
      setup.readingMaterial.title !== readingTitle)
  const displayedWorkflowStepStates = workflowStepStates
  const selectableSteps = React.useMemo(() => {
    if (!isParticipantMode) {
      return steps.map((stepItem) => stepItem.value)
    }

    return researcherPreparationReady ? [2, 3] : []
  }, [isParticipantMode, researcherPreparationReady])
  const canAdvance =
    !isStepSubmitting &&
    ((displayedWorkflowStepStates[step]?.isReady ?? false) || (stepCompletion[step] ?? false)) &&
    (isParticipantMode ? step === 2 : step < steps.length - 1)
  const canStartReadingSession =
    workflowStepStates.every((state) => state.isReady) && hasLocalReadingSelection

  React.useEffect(() => {
    if (typeof window === "undefined" || !isParticipantMode) {
      return
    }

    const syncFromStorage = () => {
      setParticipantFlowStarted(Boolean(window.localStorage.getItem(PARTICIPANT_FLOW_STARTED_KEY)))
    }

    syncFromStorage()
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PARTICIPANT_FLOW_STARTED_KEY) {
        return
      }

      syncFromStorage()
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [isParticipantMode])

  React.useEffect(() => {
    if (typeof window === "undefined" || !isParticipantMode) {
      return
    }

    if (experimentSession?.isActive || backendResearcherSetupStarted) {
      return
    }

    setParticipantFlowStarted(false)
    window.localStorage.removeItem(PARTICIPANT_FLOW_STARTED_KEY)
  }, [backendResearcherSetupStarted, experimentSession?.isActive, isParticipantMode])

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return
    }

    void updateExperimentSetupTestingOverrides({
      forceEyeTrackerReady,
      forceParticipantReady,
      forceCalibrationReady,
      forceReadingMaterialReady,
    })
  }, [
    forceCalibrationReady,
    forceEyeTrackerReady,
    forceParticipantReady,
    forceReadingMaterialReady,
    updateExperimentSetupTestingOverrides,
  ])

  const saveReadingSessionDraft = React.useCallback(async () => {
    setStartError(null)
    if (!hasLocalReadingSelection) {
      setStartError("Choose the reading material before starting the session.")
      return false
    }

    const markdown =
      readingSession.source !== "preset" && readingSession.customMarkdown.trim().length > 0
        ? readingSession.customMarkdown
        : MOCK_READING_MD

    try {
      await upsertReadingSession({
        documentId: readingDocumentId,
        title: readingTitle,
        markdown,
        sourceSetupId: readingSourceSetupId,
        experimentSetupId: readingExperimentSetupId,
        experimentSetupItemId: readingExperimentSetupItemId,
        fontFamily: presentation.fontFamily,
        fontSizePx: presentation.fontSizePx,
        lineWidthPx: presentation.lineWidthPx,
        lineHeight: presentation.lineHeight,
        letterSpacingEm: presentation.letterSpacingEm,
        editableByResearcher: presentation.editableByExperimenter,
        themeMode: resolvedTheme === "dark" ? "dark" : "light",
        palette,
        appFont: font,
        experimentItems: readingExperimentItems,
        currentExperimentItemIndex: readingCurrentExperimentItemIndex,
      }).unwrap()
      return true
    } catch (error) {
      setStartError(getErrorMessage(error, "Could not prepare the reading session."))
      return false
    }
  }, [
    hasLocalReadingSelection,
    presentation.editableByExperimenter,
    presentation.fontFamily,
    presentation.fontSizePx,
    presentation.letterSpacingEm,
    presentation.lineHeight,
    presentation.lineWidthPx,
    readingSession.customMarkdown,
    readingSession.source,
    readingDocumentId,
    readingExperimentSetupId,
    readingExperimentSetupItemId,
    readingExperimentItems,
    readingCurrentExperimentItemIndex,
    readingSourceSetupId,
    readingTitle,
    resolvedTheme,
    upsertReadingSession,
    font,
    palette,
  ])

  const handleStartReadingSession = React.useCallback(async () => {
    setStartError(null)

    if (hasUnsavedReadingDraft || !(workflowStepStates[1]?.isReady ?? false)) {
      const didSaveReadingSession = await saveReadingSessionDraft()
      if (!didSaveReadingSession) {
        return
      }
    }

    try {
      await startExperimentSession().unwrap()
      router.push(isParticipantMode ? "/reading" : "/researcher/current-live")
    } catch (error) {
      setStartError(getErrorMessage(error, "Could not start the reading session."))
    }
  }, [
    hasUnsavedReadingDraft,
    isParticipantMode,
    router,
    saveReadingSessionDraft,
    startExperimentSession,
    workflowStepStates,
  ])

  React.useEffect(() => {
    if (!experimentSession) {
      return
    }

    dispatch(hydrateExperimentFromSession(experimentSession))
    setStep((currentStep) => {
      const fallbackStep = isParticipantMode
        ? !researcherPreparationReady
          ? 0
          : firstParticipantIncompleteStepIndex === -1
            ? 3
            : Math.max(firstParticipantIncompleteStepIndex, 2)
        : firstIncompleteStepIndex === -1
          ? steps.length - 1
          : firstIncompleteStepIndex

      if (
        (isParticipantMode && !selectableSteps.includes(currentStep)) ||
        (!(displayedWorkflowStepStates[currentStep]?.isAvailable ?? false) &&
        !(displayedWorkflowStepStates[currentStep]?.isReady ?? false)
        )
      ) {
        return fallbackStep
      }

      return currentStep
    })
  }, [
    dispatch,
    displayedWorkflowStepStates,
    experimentSession,
    firstIncompleteStepIndex,
    firstParticipantIncompleteStepIndex,
    isParticipantMode,
    researcherPreparationReady,
    selectableSteps,
  ])

  React.useEffect(() => {
    if (!isParticipantMode || !experimentSession?.isActive) {
      return
    }

    router.push("/reading")
  }, [experimentSession?.isActive, isParticipantMode, router])

  React.useEffect(() => {
    if (!isParticipantMode || typeof window === "undefined") {
      return
    }

    const handleRequestToken = (token: string | null) => {
      if (!token) {
        return
      }

      const lastHandled = window.sessionStorage.getItem(PARTICIPANT_CALIBRATION_RERUN_HANDLED_KEY)
      if (lastHandled === token) {
        return
      }

      window.sessionStorage.setItem(PARTICIPANT_CALIBRATION_RERUN_HANDLED_KEY, token)
      const requestKind = token.endsWith(":full") ? "full" : "validation"
      setParticipantRerunNotice(
        requestKind === "full"
          ? "Researcher requested a full calibration rerun."
          : "Researcher requested a validation rerun."
      )

      if (!setup.participant.isReady) {
        return
      }

      router.push("/calibration?returnTo=/participant")
    }

    handleRequestToken(window.localStorage.getItem(PARTICIPANT_CALIBRATION_RERUN_REQUEST_KEY))

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PARTICIPANT_CALIBRATION_RERUN_REQUEST_KEY) {
        return
      }

      handleRequestToken(event.newValue)
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [isParticipantMode, router, setup.participant.isReady])

  const setStepComplete = React.useCallback((stepIndex: number, isComplete: boolean) => {
    setStepCompletion((prev) => {
      if (prev[stepIndex] === isComplete) {
        return prev
      }

      return { ...prev, [stepIndex]: isComplete }
    })
  }, [])

  const handleStepSubmitterChange = React.useCallback(
    (submitHandler: (() => Promise<boolean>) | null) => {
      stepSubmitHandlerRef.current = submitHandler
    },
    []
  )

  const handleStepSubmittingChange = React.useCallback((isSubmitting: boolean) => {
    setIsStepSubmitting((prev) => (prev === isSubmitting ? prev : isSubmitting))
  }, [])

  const handleStepZeroCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(0, isComplete)
    },
    [setStepComplete]
  )

  const handleStepOneCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(1, isComplete)
    },
    [setStepComplete]
  )

  const handleStepTwoCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(2, isComplete)
    },
    [setStepComplete]
  )

  const handleStepThreeCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(3, isComplete)
    },
    [setStepComplete]
  )

  const handleNext = async () => {
    if ((isParticipantMode && step !== 2) || (!isParticipantMode && step === steps.length - 1) || !canAdvance) {
      return
    }

    const submitStep = stepSubmitHandlerRef.current
    if (submitStep) {
      const success = await submitStep()
      if (!success) {
        return
      }
    }

    setStep((prev) => (isParticipantMode ? 3 : Math.min(prev + 1, steps.length - 1)))
  }

  const nextButtonLabel = isParticipantMode
    ? "Continue to calibration"
    : step === 0
      ? "Save researcher setup"
      : step === 1
        ? "Apply baseline & continue"
      : step === 2
          ? "Continue to calibration"
          : "Next"
  const participantSetupComplete = setup.participant.isReady && setup.calibration.isReady
  const participantReturnPath = isParticipantMode ? "/participant" : "/researcher/experiment"
  const canGoBack = isParticipantMode ? step > 2 : step > 0

  return (
    <div
      className={cn(
        "grid gap-6 2xl:gap-8",
        isParticipantMode
          ? "xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start"
          : "2xl:grid-cols-[320px_minmax(0,1fr)]"
      )}
    >
      <aside
        className={cn(
          isParticipantMode ? "xl:sticky xl:top-8 xl:self-start" : "2xl:sticky 2xl:top-24 2xl:self-start"
        )}
      >
        <ExperimentStepNavigation
          step={step}
          onStepChange={setStep}
          stepStates={displayedWorkflowStepStates}
          steps={steps}
          mode={mode}
          selectableSteps={selectableSteps}
        />
      </aside>

      <section className={cn("space-y-6", isParticipantMode && "space-y-7")}>
        {isParticipantMode && participantRerunNotice ? (
          <Alert>
            <AlertTitle>Researcher request</AlertTitle>
            <AlertDescription>
              {participantRerunNotice} Continue with calibration from this screen.
            </AlertDescription>
          </Alert>
        ) : null}

        {isParticipantMode && !researcherPreparationReady ? (
          <Card>
            <CardHeader className="border-b pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Researcher preparation</Badge>
                <Badge variant="outline">Waiting</Badge>
              </div>
              <CardTitle className="mt-3 text-3xl tracking-tight">
                {hasResearcherStartedSetup
                  ? "Your session is being prepared."
                  : "Experiment has not started yet."}
              </CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7">
                {hasResearcherStartedSetup
                  ? "The researcher is finishing setup. This page will unlock automatically when it is ready."
                  : "The researcher has not started experiment setup yet. This page will unlock after setup begins."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm leading-6 text-muted-foreground">
                {hasResearcherStartedSetup
                  ? "Please wait here. Your participant steps will appear as soon as the researcher finishes preparation."
                  : "Please keep this page open. Once the researcher clicks Start Experiment and begins setup, your steps will appear automatically."}
              </p>
            </CardContent>
          </Card>
        ) : step === 0 ? (
          sensingMode === "mouse" ? (
            <MouseModeSetupStep
              onCompletionChange={handleStepZeroCompletionChange}
              onSubmittingChange={handleStepSubmittingChange}
              onSubmitRequestChange={handleStepSubmitterChange}
            />
          ) : (
            <EyetrackerSetup
              setup={setup.eyeTracker}
              onCompletionChange={handleStepZeroCompletionChange}
              onSubmittingChange={handleStepSubmittingChange}
              onSubmitRequestChange={handleStepSubmitterChange}
            />
          )
        ) : step === 1 ? (
          <SessionContentStep
            onCompletionChange={handleStepOneCompletionChange}
            onSubmitRequestChange={handleStepSubmitterChange}
            saveReadingSessionDraft={saveReadingSessionDraft}
            currentDecisionConfiguration={
              experimentSession?.decisionConfiguration ?? EMPTY_DECISION_CONFIGURATION
            }
            currentEyeMovementAnalysisConfiguration={
              experimentSession?.eyeMovementAnalysisConfiguration ??
              EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION
            }
            externalProviderStatus={
              experimentSession?.externalProviderStatus ?? EMPTY_EXTERNAL_PROVIDER_STATUS
            }
            eyeMovementAnalysisProviderStatus={
              experimentSession?.eyeMovementAnalysisProviderStatus ??
              EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS
            }
            automationPaused={experimentSession?.decisionState?.automationPaused ?? false}
          />
        ) : step === 2 ? (
          <ParticipantInformationForm
            onCompletionChange={handleStepTwoCompletionChange}
            onSubmittingChange={handleStepSubmittingChange}
            onSubmitRequestChange={handleStepSubmitterChange}
          />
        ) : (
          <CalibrationStep
            setup={setup.calibration}
            calibration={experimentSession?.calibration}
            sensingMode={sensingMode}
            returnToPath={participantReturnPath}
            isReadOnly={!isParticipantMode}
            onCompletionChange={handleStepThreeCompletionChange}
            onSubmittingChange={handleStepSubmittingChange}
            onSubmitRequestChange={handleStepSubmitterChange}
          />
        )}

        {startError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not start</AlertTitle>
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        ) : null}

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border px-5 py-4",
            "bg-card"
          )}
        >
          <Button
            disabled={!canGoBack}
            onClick={() => setStep((currentStep) => (isParticipantMode ? 2 : currentStep - 1))}
          >
            Previous
          </Button>
          {isParticipantMode ? (
            !researcherPreparationReady ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {hasResearcherStartedSetup
                  ? "Preparing your setup. Your steps will appear in a moment."
                  : "Waiting for the researcher to start the experiment setup."}
              </p>
            ) : step === 2 ? (
              <Button
                disabled={!canAdvance}
                onClick={handleNext}
              >
                {nextButtonLabel}
              </Button>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                {participantSetupComplete
                  ? "Participant setup is complete. Return to the researcher to start the reading session."
                  : "Finish calibration on the full-screen calibration route, then return here."}
              </p>
            )
          ) : step < steps.length - 1 ? (
            <Button
              disabled={step === steps.length - 1 || !canAdvance}
              onClick={handleNext}
            >
              {nextButtonLabel}
            </Button>
          ) : (
            <Button
              disabled={!canStartReadingSession || isSavingReadingSession || isStartingExperimentSession}
              onClick={() => void handleStartReadingSession()}
            >
              {isSavingReadingSession || isStartingExperimentSession
                ? "Starting session..."
                : "Start reading session"}
            </Button>
          )}
        </div>

        {isParticipantMode && participantSetupComplete ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">Waiting for the researcher to start the session</CardTitle>
              <CardDescription className="text-sm leading-6">
                Participant information and calibration are ready. The reading page will begin once the researcher starts the experiment session.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>
    </div>
  )
}
