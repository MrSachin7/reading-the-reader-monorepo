"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { LucideIcon } from "lucide-react"
import { BookOpen, Camera, Crosshair, FileText, MousePointer2, Plus, ScanEye } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
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
  type WebcamSensingStatusSnapshot,
} from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { getErrorMessage, getErrorStatus } from "@/lib/error-utils"
import { mapExperimentSetupItemsToSequenceItems } from "@/lib/experiment-sequence"
import {
  hydrateExperimentFromSession,
  setReadingSessionExperimentSelection,
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
              isCompleted && "border-primary/35 bg-primary/10",
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
                      ? "border-primary bg-primary/10 text-primary"
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

function getDecisionOptionValue(
  option: Pick<DecisionConditionOption, "providerId" | "executionMode">
) {
  return `${option.providerId}:${option.executionMode}`
}

function resolveConditionOptionValue(value: string) {
  return (
    DECISION_CONDITION_OPTIONS.find((option) => getDecisionOptionValue(option) === value) ??
    DECISION_CONDITION_OPTIONS[0]
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

function WebcamModeSetupStep({
  webcamStatus,
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: {
  webcamStatus: WebcamSensingStatusSnapshot
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}) {
  const isReady = webcamStatus.isConnected

  React.useEffect(() => {
    onCompletionChange?.(isReady)
  }, [isReady, onCompletionChange])

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
          <Badge variant="outline">Webcam mode</Badge>
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">Webcam sensing is active.</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          The setup flow skips eyetracker selection and expects a working webcam before the session can start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3 rounded-[1.5rem] border bg-muted/20 p-4">
          <Camera className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              {isReady ? "Webcam ready" : "Webcam unavailable"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isReady
                ? "The webcam preflight check passed. You can continue with webcam-based gaze and facial sensing."
                : webcamStatus.detail ?? "Connect a webcam to continue with webcam-only sensing."}
            </p>
          </div>
        </div>

        {!isReady ? (
          <Alert variant="destructive">
            <AlertTitle>Webcam required</AlertTitle>
            <AlertDescription>
              Webcam-only sessions cannot start until a camera is connected and detected by the backend.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
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
  isReadingMaterialSelectionLocked?: boolean
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
  isReadingMaterialSelectionLocked = false,
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
  const hasSelectedMaterial =
    readingSession.selectedExperimentSetupId !== null &&
    readingSession.selectedExperimentSetupItemId !== null
  const readyExperimentSetups = React.useMemo(
    () => experimentSetups.filter((setup) => setup.status === "ready"),
    [experimentSetups]
  )
  const selectedExperimentSetup = React.useMemo(
    () =>
      experimentSetups.find((setup) => setup.id === readingSession.selectedExperimentSetupId) ??
      null,
    [experimentSetups, readingSession.selectedExperimentSetupId]
  )
  const selectedPresentationLabel = selectedExperimentSetup?.name ?? "Reusable experiment"
  const localReadingBaselineLabel = "Reusable experiment"
  const selectedExperimentItem = selectedExperimentSetup?.items.find(
    (item) => item.id === readingSession.selectedExperimentSetupItemId
  )
  const localControlLabel = selectedExperimentItem
    ? selectedExperimentItem.editableByExperimenter
      ? "Live-adjustable"
      : "Locked"
    : "—"
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
  const selectedDecisionValue = getDecisionOptionValue(selectedConditionOption)
  const decisionPluginName =
    externalProviderStatus.displayName ?? externalProviderStatus.providerId ?? "Decision-maker service"
  const eyeAnalyzerPluginName =
    eyeMovementAnalysisProviderStatus.displayName ??
    eyeMovementAnalysisProviderStatus.providerId ??
    "Eye analyzer service"
  const isSelectedAnalysisPluginUnavailable =
    selectedAnalysisProviderId === "external" && !eyeMovementAnalysisProviderStatus.isConnected
  const selectedAnalysisOption =
    EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS.find(
      (option) => option.providerId === selectedAnalysisProviderId
    ) ?? EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS[0]
  const decisionStatusLabel = externalProviderStatus.isConnected
    ? "Connected"
    : isSelectedConditionUnavailable
      ? "Unavailable"
      : "Built-in"
  const analysisStatusLabel = eyeMovementAnalysisProviderStatus.isConnected
    ? "Connected"
    : isSelectedAnalysisPluginUnavailable
      ? "Unavailable"
      : "Built-in"

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

  const handleDecisionPluginChange = React.useCallback(
    async (value: string) => {
      const option = resolveConditionOptionValue(value)
      const isUnavailable =
        option.providerId === "external" &&
        !isExternalConditionAvailable(option, externalProviderStatus)

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
    },
    [automationPaused, externalProviderStatus, updateDecisionConfiguration]
  )

  const handleAnalysisPluginChange = React.useCallback(
    async (providerId: string) => {
      const option =
        EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS.find(
          (pluginOption) => pluginOption.providerId === providerId
        ) ?? EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS[0]
      const isUnavailable =
        option.providerId === "external" && !eyeMovementAnalysisProviderStatus.isConnected

      if (isUnavailable) {
        return
      }

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
    },
    [eyeMovementAnalysisProviderStatus.isConnected, updateEyeMovementAnalysisConfiguration]
  )

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

          {isReadingMaterialSelectionLocked ? (
            <Alert>
              <AlertTitle>Reading material locked</AlertTitle>
              <AlertDescription>
                This session was started from a template, so its reading baseline stays fixed here.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {readyExperimentSetups.map((setup) => (
              <button
                key={setup.id}
                type="button"
                disabled={isLoadingSelectedExperiment || isReadingMaterialSelectionLocked}
                onClick={async () => {
                  if (isReadingMaterialSelectionLocked) {
                    return
                  }

                  setSelectionError(null)

                  try {
                    const savedSetup = await getExperimentSetupById(setup.id).unwrap()
                    const firstItem = savedSetup.items[0]
                    if (!firstItem) {
                      setSelectionError("That experiment does not contain any reading materials yet.")
                      return
                    }

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
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-colors",
                  "bg-card hover:border-primary/40 hover:bg-accent/30",
                  readingSession.selectedExperimentSetupId === setup.id && "border-primary bg-accent/50",
                  isReadingMaterialSelectionLocked &&
                    "cursor-not-allowed opacity-60 hover:border-border hover:bg-card"
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
              disabled={isLoadingExperimentSetups || isReadingMaterialSelectionLocked}
              className={cn(
                "flex min-h-[170px] w-full flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent/30",
                isReadingMaterialSelectionLocked &&
                  "cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/20"
              )}
            >
              <Plus className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-base font-semibold">Create experiment</p>
            </button>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Runtime plugins</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the decision and eye movement analysis plugins for this session.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    isSelectedConditionUnavailable
                      ? "destructive"
                      : externalProviderStatus.isConnected
                        ? "default"
                        : "secondary"
                  }
                >
                  Decision: {decisionStatusLabel}
                </Badge>
                <Badge
                  variant={
                    isSelectedAnalysisPluginUnavailable
                      ? "destructive"
                      : eyeMovementAnalysisProviderStatus.isConnected
                        ? "default"
                        : "secondary"
                  }
                >
                  Analyzer: {analysisStatusLabel}
                </Badge>
              </div>
            </div>

            <FieldGroup className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel>Decision plugin</FieldLabel>
                  <Badge variant="outline">{selectedConditionOption.pluginLabel}</Badge>
                </div>
                <Select
                  value={selectedDecisionValue}
                  disabled={isSavingDecisionConfiguration}
                  onValueChange={handleDecisionPluginChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select decision plugin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DECISION_CONDITION_OPTIONS.map((option) => {
                        const isUnavailable =
                          option.providerId === "external" &&
                          !isExternalConditionAvailable(option, externalProviderStatus)

                        return (
                          <SelectItem
                            key={option.label}
                            value={getDecisionOptionValue(option)}
                            disabled={isUnavailable}
                          >
                            {option.label}
                            {isUnavailable ? " - unavailable" : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {externalProviderStatus.isConnected
                    ? `${decisionPluginName} is connected.`
                    : isSelectedConditionUnavailable
                      ? "Reconnect the decision-maker service or switch to a built-in option."
                      : "External decision plugins become selectable when a service connects."}
                </FieldDescription>
              </Field>
              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel>Eye analyzer</FieldLabel>
                  <Badge variant="outline">{selectedAnalysisOption.pluginLabel}</Badge>
                </div>
                <Select
                  value={selectedAnalysisOption.providerId}
                  disabled={isSavingAnalysisConfiguration}
                  onValueChange={handleAnalysisPluginChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select eye analyzer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {EYE_MOVEMENT_ANALYSIS_PLUGIN_OPTIONS.map((option) => {
                        const isUnavailable =
                          option.providerId === "external" &&
                          !eyeMovementAnalysisProviderStatus.isConnected

                        return (
                          <SelectItem
                            key={option.providerId}
                            value={option.providerId}
                            disabled={isUnavailable}
                          >
                            {option.label}
                            {isUnavailable ? " - unavailable" : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {eyeMovementAnalysisProviderStatus.isConnected
                    ? `${eyeAnalyzerPluginName} is connected.`
                    : isSelectedAnalysisPluginUnavailable
                      ? "Reconnect the analyzer service or switch to the built-in analyzer."
                      : "The built-in analyzer remains active until an external analyzer is selected."}
                </FieldDescription>
              </Field>
            </FieldGroup>
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
              {readingSession.selectedExperimentSetupName ? (
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
  const searchParams = useSearchParams()
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
  const [getExperimentSetupById] = useLazyGetExperimentSetupByIdQuery()
  const [upsertReadingSession, { isLoading: isSavingReadingSession }] =
    useUpsertReadingSessionMutation()
  const [startExperimentSession, { isLoading: isStartingExperimentSession }] =
    useStartExperimentSessionMutation()
  const [updateTemplateDecisionConfiguration] = useUpdateDecisionConfigurationMutation()
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
  const appliedTemplateQueryRef = React.useRef<string | null>(null)

  const setup = experimentSession?.setup ?? EMPTY_EXPERIMENT_SETUP
  const sensingMode: SensingMode = experimentSession?.sensingMode ?? "eyeTracker"
  const webcamStatus = experimentSession?.webcamStatus
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
    readingSession.selectedExperimentSetupId && readingSession.selectedExperimentSetupItemId
      ? `${readingSession.selectedExperimentSetupId}:${readingSession.selectedExperimentSetupItemId}`
      : null
  const readingSourceSetupId = readingSession.selectedReadingMaterialSetupId
  const readingExperimentSetupId = readingSession.selectedExperimentSetupId
  const readingExperimentSetupItemId = readingSession.selectedExperimentSetupItemId
  const selectedExperimentSetup = React.useMemo(
    () =>
      experimentSetups.find((setup) => setup.id === readingSession.selectedExperimentSetupId) ??
      null,
    [experimentSetups, readingSession.selectedExperimentSetupId]
  )
  const templateIdFromQuery = searchParams.get("templateId")

  React.useEffect(() => {
    if (!templateIdFromQuery || appliedTemplateQueryRef.current === templateIdFromQuery) {
      return
    }

    appliedTemplateQueryRef.current = templateIdFromQuery
    void (async () => {
      try {
        const savedSetup = await getExperimentSetupById(templateIdFromQuery).unwrap()
        if (savedSetup.status !== "ready") {
          return
        }

        const firstItem = savedSetup.items[0]
        if (!firstItem) {
          return
        }

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
        const decisionOption = resolveConditionOption(
          savedSetup.decisionProviderId,
          savedSetup.decisionExecutionMode
        )
        await updateTemplateDecisionConfiguration({
          conditionLabel: decisionOption.label,
          providerId: savedSetup.decisionProviderId,
          executionMode: savedSetup.decisionExecutionMode,
          automationPaused: experimentSession?.decisionState?.automationPaused ?? false,
        }).unwrap()
        setStep(1)
      } catch {
        appliedTemplateQueryRef.current = null
      }
    })()
  }, [
    dispatch,
    experimentSession?.decisionState?.automationPaused,
    getExperimentSetupById,
    templateIdFromQuery,
    updateTemplateDecisionConfiguration,
  ])
  const readingExperimentItems = selectedExperimentSetup
    ? mapExperimentSetupItemsToSequenceItems(selectedExperimentSetup.items)
    : undefined
  const readingCurrentExperimentItemIndex = selectedExperimentSetup
    ? Math.max(
        0,
        selectedExperimentSetup.items.findIndex(
          (item) => item.id === readingSession.selectedExperimentSetupItemId
        )
      )
    : undefined
  const hasLocalReadingSelection =
    readingSession.selectedExperimentSetupId !== null &&
    readingSession.selectedExperimentSetupItemId !== null
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

    const markdown = readingSession.customMarkdown.trim().length > 0
      ? readingSession.customMarkdown
      : MOCK_READING_MD

    try {
      await upsertReadingSession({
        documentId: readingDocumentId ?? "",
        title: readingTitle,
        markdown,
        sourceSetupId: readingSourceSetupId,
        experimentSetupId: readingExperimentSetupId,
        experimentSetupName: readingSession.selectedExperimentSetupName,
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
        orderMode: selectedExperimentSetup?.orderMode ?? "fixed",
        isOneOff: false,
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
    readingSession.selectedExperimentSetupName,
    readingDocumentId,
    readingExperimentSetupId,
    readingExperimentSetupItemId,
    readingExperimentItems,
    readingCurrentExperimentItemIndex,
    readingSourceSetupId,
    readingTitle,
    resolvedTheme,
    selectedExperimentSetup,
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
  const isWebcamMode = sensingMode === "webcam"
  const isHybridWebcamMode = sensingMode === "eyeTrackerPlusFace"
  const webcamUnavailable = Boolean(
    webcamStatus &&
    !webcamStatus.isConnected &&
    webcamStatus.status === "unavailable"
  )

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

        {!isParticipantMode && isWebcamMode && webcamUnavailable ? (
          <Alert variant="destructive">
            <AlertTitle>Webcam unavailable</AlertTitle>
            <AlertDescription>
              {webcamStatus?.detail ??
                "Webcam-only sessions are blocked until the backend detects an available camera."}
            </AlertDescription>
          </Alert>
        ) : null}

        {!isParticipantMode && isHybridWebcamMode && webcamUnavailable ? (
          <Alert>
            <AlertTitle>Hybrid mode is degraded</AlertTitle>
            <AlertDescription>
              {webcamStatus?.detail ??
                "Tobii gaze can still run, but facial webcam signals are currently unavailable."}
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
          ) : sensingMode === "webcam" ? (
            <WebcamModeSetupStep
              webcamStatus={
                webcamStatus ?? {
                  isConnected: false,
                  status: "idle",
                  lastFrameAtUnixMs: null,
                  lastProcessedAtUnixMs: null,
                  captureQuality: 0,
                  consecutiveFailures: 0,
                  detail: null,
                }
              }
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
            isReadingMaterialSelectionLocked={Boolean(templateIdFromQuery)}
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
