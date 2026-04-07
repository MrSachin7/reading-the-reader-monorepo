"use client"

import * as React from "react"
import { Check, LoaderCircle, Plus, Save } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FONTS, type FontTheme } from "@/hooks/use-font-theme"
import { getErrorMessage, getErrorStatus } from "@/lib/error-utils"
import { MarkdownReader } from "@/modules/pages/reading/components/MarkdownReader"
import { MOCK_READING_MD } from "@/modules/pages/reading/content/mockReading"
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown"
import {
  applyReadingPresentationDraft,
  applyReadingPresentationSettings,
  useReadingSettings,
} from "@/modules/pages/reading/lib/useReadingSettings"
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize"
import {
  type CreateReadingMaterialSetupRequest,
  type ReadingMaterialSetup,
  setReadingSessionCustomMarkdown,
  setReadingSessionResearcherQuestions,
  setReadingSessionSource,
  setReadingSessionTitle,
  useAppDispatch,
  useCreateReadingMaterialSetupMutation,
  useGetReadingMaterialSetupsQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useUpdateReadingMaterialSetupMutation,
} from "@/redux"

type DraftState = CreateReadingMaterialSetupRequest

const FONT_LABELS: Record<FontTheme, string> = {
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
}

const FONT_FAMILY_STYLES: Record<FontTheme, string> = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  "space-grotesk": "var(--font-space-grotesk)",
  merriweather: "var(--font-merriweather)",
}

const defaultDraft: DraftState = {
  name: "Default reading material setup",
  title: "Reading as Deliberate Attention",
  markdown: MOCK_READING_MD,
  researcherQuestions: "",
  fontFamily: "merriweather",
  fontSizePx: 18,
  lineWidthPx: 680,
  lineHeight: 1.7,
  letterSpacingEm: 0.02,
  editableByExperimenter: true,
}

const emptyCustomDraft: DraftState = {
  ...defaultDraft,
  title: "Untitled text",
  markdown: "",
}

function buildExcerpt(markdown: string, wordLimit: number) {
  return markdown
    .replace(/[#*_`>-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, wordLimit)
    .join(" ")
}

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function normalizeReadingMaterialSetup(
  value: unknown,
  fallback: DraftState
): ReadingMaterialSetup | null {
  if (typeof value !== "object" || !value) {
    return null
  }

  const setup = value as Partial<ReadingMaterialSetup>
  const id = typeof setup.id === "string" && setup.id.length > 0 ? setup.id : null
  const name = typeof setup.name === "string" && setup.name.length > 0 ? setup.name : fallback.name

  if (!id) {
    return null
  }

  return {
    id,
    name,
    title: typeof setup.title === "string" ? setup.title : fallback.title,
    markdown: typeof setup.markdown === "string" ? setup.markdown : fallback.markdown,
    researcherQuestions:
      typeof setup.researcherQuestions === "string"
        ? setup.researcherQuestions
        : fallback.researcherQuestions,
    fontFamily:
      setup.fontFamily === "geist" ||
      setup.fontFamily === "inter" ||
      setup.fontFamily === "space-grotesk" ||
      setup.fontFamily === "merriweather"
        ? setup.fontFamily
        : fallback.fontFamily,
    fontSizePx: typeof setup.fontSizePx === "number" ? setup.fontSizePx : fallback.fontSizePx,
    lineWidthPx: typeof setup.lineWidthPx === "number" ? setup.lineWidthPx : fallback.lineWidthPx,
    lineHeight: typeof setup.lineHeight === "number" ? setup.lineHeight : fallback.lineHeight,
    letterSpacingEm:
      typeof setup.letterSpacingEm === "number" ? setup.letterSpacingEm : fallback.letterSpacingEm,
    editableByExperimenter:
      typeof setup.editableByExperimenter === "boolean"
        ? setup.editableByExperimenter
        : fallback.editableByExperimenter,
    createdAtUnixMs:
      typeof setup.createdAtUnixMs === "number" ? setup.createdAtUnixMs : Date.now(),
    updatedAtUnixMs:
      typeof setup.updatedAtUnixMs === "number" ? setup.updatedAtUnixMs : Date.now(),
  }
}

export default function ReadingMaterialSetupPage() {
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const { resetReadingSettings } = useReadingSettings()
  const startInCustomEmptyMode = searchParams.get("mode") === "custom-empty"
  const [draft, setDraft] = React.useState<DraftState>(() =>
    startInCustomEmptyMode ? emptyCustomDraft : defaultDraft
  )
  const [selectedSetupId, setSelectedSetupId] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [selectionError, setSelectionError] = React.useState<string | null>(null)

  const { data: savedSetups = [], isLoading: isLoadingSetups, refetch } = useGetReadingMaterialSetupsQuery()
  const [getReadingMaterialSetupById, { isFetching: isLoadingSelectedSetup }] =
    useLazyGetReadingMaterialSetupByIdQuery()
  const [createReadingMaterialSetup, { isLoading: isCreating }] =
    useCreateReadingMaterialSetupMutation()
  const [updateReadingMaterialSetup, { isLoading: isUpdating }] =
    useUpdateReadingMaterialSetupMutation()

  const isSaving = isCreating || isUpdating
  const presetExcerpt = React.useMemo(() => buildExcerpt(MOCK_READING_MD, 26), [])
  const previewBlocks = React.useMemo(() => {
    const parsed = parseMinimalMarkdown(draft.markdown)
    return tokenizeDocument(parsed, "reading-material-setup-preview")
  }, [draft.markdown])
  const isBuiltInSelected =
    selectedSetupId === null &&
    draft.title === defaultDraft.title &&
    draft.markdown === defaultDraft.markdown
  const isCustomSelected =
    selectedSetupId !== null ||
    draft.markdown !== defaultDraft.markdown ||
    draft.title === "Untitled text"

  const deriveDraftSource = React.useCallback((nextDraft: DraftState): "preset" | "custom" => {
    return nextDraft.title === defaultDraft.title && nextDraft.markdown === defaultDraft.markdown
      ? "preset"
      : "custom"
  }, [])

  const syncReadingSession = React.useCallback(
    (nextDraft: DraftState, source: "preset" | "custom") => {
      dispatch(setReadingSessionTitle(nextDraft.title))
      dispatch(setReadingSessionResearcherQuestions(nextDraft.researcherQuestions))
      dispatch(setReadingSessionCustomMarkdown(nextDraft.markdown))
      dispatch(setReadingSessionSource(source))
    },
    [dispatch]
  )

  React.useEffect(() => {
    if (!startInCustomEmptyMode) {
      return
    }

    setSelectedSetupId(null)
    setSaveError(null)
    setSelectionError(null)
    setDraft(emptyCustomDraft)
    resetReadingSettings()
    syncReadingSession(emptyCustomDraft, "custom")
  }, [resetReadingSettings, startInCustomEmptyMode, syncReadingSession])

  const applySetup = React.useCallback(
    (next: { id: string; name: string } & DraftState) => {
      setDraft({
        name: next.name,
        title: next.title,
        markdown: next.markdown,
        researcherQuestions: next.researcherQuestions,
        fontFamily: next.fontFamily,
        fontSizePx: next.fontSizePx,
        lineWidthPx: next.lineWidthPx,
        lineHeight: next.lineHeight,
        letterSpacingEm: next.letterSpacingEm,
        editableByExperimenter: next.editableByExperimenter,
      })
      setSelectedSetupId(next.id)
      syncReadingSession(next, "custom")
      applyReadingPresentationSettings(next)
    },
    [syncReadingSession]
  )

  const handleLoadSavedSetup = React.useCallback(
    async (id: string) => {
      setSelectionError(null)

      try {
        const response = await getReadingMaterialSetupById(id).unwrap()
        const setup = normalizeReadingMaterialSetup(response, draft)
        if (!setup) {
          setSelectionError("The saved reading material setup is invalid.")
          return
        }

        applySetup(setup)
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setSelectionError("That reading material setup no longer exists.")
          void refetch()
          return
        }

        setSelectionError(getErrorMessage(error, "Could not load that reading material setup."))
      }
    },
    [applySetup, draft, getReadingMaterialSetupById, refetch]
  )

  const handleStartNew = React.useCallback(() => {
    setSelectedSetupId(null)
    setSaveError(null)
    setSelectionError(null)
    setDraft(defaultDraft)
    applyReadingPresentationDraft(defaultDraft)
    syncReadingSession(defaultDraft, "preset")
  }, [syncReadingSession])

  const applyLocalDraft = React.useCallback(
    (nextDraft: DraftState, source: "preset" | "custom") => {
      setSelectedSetupId(null)
      setSaveError(null)
      setSelectionError(null)
      setDraft(nextDraft)
      syncReadingSession(nextDraft, source)
      applyReadingPresentationDraft(nextDraft)
    },
    [syncReadingSession]
  )

  const handleSave = React.useCallback(async () => {
    setSaveError(null)

    try {
      const response = selectedSetupId
        ? await updateReadingMaterialSetup({ id: selectedSetupId, body: draft }).unwrap()
        : await createReadingMaterialSetup(draft).unwrap()

      const savedSetup = normalizeReadingMaterialSetup(response, draft)
      if (!savedSetup) {
        setSaveError("The saved reading material setup is invalid.")
        return
      }

      applySetup(savedSetup)
      void refetch()
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        setSelectedSetupId(null)
        setSaveError("This reading material setup no longer exists.")
        void refetch()
        return
      }

      setSaveError(getErrorMessage(error, "Could not save the reading material setup."))
    }
  }, [applySetup, createReadingMaterialSetup, draft, refetch, selectedSetupId, updateReadingMaterialSetup])

  const canSave =
    !isSaving &&
    draft.name.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    draft.markdown.trim().length > 0

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reading material setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a reading text and presentation baseline for experiments.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={!canSave} className="shrink-0">
          {isSaving ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {selectedSetupId ? "Update" : "Save setup"}
        </Button>
      </div>

      {/* ── Error banners ── */}
      {saveError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      ) : null}
      {selectionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {selectionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.9fr)]">
        {/* ── Left column: form ── */}
        <div className="space-y-4">

          {/* Saved setups */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <p className="text-sm font-medium">Saved setups</p>
              <Button variant="ghost" size="sm" className="-mr-2" onClick={handleStartNew}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
            </div>

            {isLoadingSetups ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : savedSetups.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                No saved setups yet. Fill in the form below and save.
              </p>
            ) : (
              <div className="divide-y">
                {savedSetups.map((setup) => (
                  <button
                    key={setup.id}
                    type="button"
                    onClick={() => void handleLoadSavedSetup(setup.id)}
                    disabled={isLoadingSelectedSetup}
                    className={`w-full px-5 py-3.5 text-left transition-colors ${
                      selectedSetupId === setup.id
                        ? "bg-accent/60"
                        : "hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{setup.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {setup.title} · {formatDate(setup.updatedAtUnixMs)}
                        </p>
                      </div>
                      {selectedSetupId === setup.id ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Content */}
          <Card>
            <div className="border-b px-5 py-4">
              <p className="text-sm font-medium">Content</p>
            </div>
            <div className="space-y-5 px-5 py-5">
              {/* Source toggle */}
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextDraft = { ...draft, title: defaultDraft.title, markdown: defaultDraft.markdown }
                    applyLocalDraft(nextDraft, "preset")
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    isBuiltInSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Built-in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextDraft = {
                      ...draft,
                      title:
                        draft.title.trim().length > 0 && draft.title !== defaultDraft.title
                          ? draft.title
                          : "Untitled text",
                      markdown:
                        draft.markdown === defaultDraft.markdown ? "" : draft.markdown,
                    }
                    applyLocalDraft(nextDraft, "custom")
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    isCustomSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Built-in preview excerpt */}
              {isBuiltInSelected ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium">{defaultDraft.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {presetExcerpt}…
                  </p>
                </div>
              ) : null}

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="setup-name">Setup name</FieldLabel>
                  <Input
                    id="setup-name"
                    value={draft.name}
                    onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Baseline condition A"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="text-title">Text title</FieldLabel>
                  <Input
                    id="text-title"
                    value={draft.title}
                    onChange={(e) => {
                      const nextDraft = { ...draft, title: e.target.value }
                      applyLocalDraft(nextDraft, "custom")
                    }}
                    placeholder="Title shown to participant"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="markdown-text">Markdown text</FieldLabel>
                  <Textarea
                    id="markdown-text"
                    value={draft.markdown}
                    onChange={(e) => {
                      const nextDraft = { ...draft, markdown: e.target.value }
                      applyLocalDraft(nextDraft, "custom")
                    }}
                    className="min-h-48 resize-y font-mono text-xs"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="researcher-questions">Researcher questions</FieldLabel>
                  <FieldDescription>
                    Optional comprehension or discussion questions for post-session review.
                  </FieldDescription>
                  <Textarea
                    id="researcher-questions"
                    value={draft.researcherQuestions}
                    onChange={(e) => {
                      const nextDraft = { ...draft, researcherQuestions: e.target.value }
                      applyLocalDraft(nextDraft, "custom")
                    }}
                    className="min-h-24 resize-y"
                    placeholder="Optional…"
                  />
                </Field>
              </FieldGroup>
            </div>
          </Card>

          {/* Typography */}
          <Card>
            <div className="border-b px-5 py-4">
              <p className="text-sm font-medium">Typography</p>
            </div>
            <div className="space-y-5 px-5 py-5">
              <Field>
                <FieldLabel htmlFor="font-family">Font family</FieldLabel>
                <Select
                  value={draft.fontFamily}
                  onValueChange={(value) => {
                    const nextDraft = { ...draft, fontFamily: value as FontTheme }
                    applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                  }}
                >
                  <SelectTrigger id="font-family" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {FONT_LABELS[font]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-5">
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>Font size</FieldLabel>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {draft.fontSizePx}px
                    </span>
                  </div>
                  <Slider
                    min={14}
                    max={28}
                    step={1}
                    value={[draft.fontSizePx]}
                    onValueChange={(v) => {
                      const nextDraft = { ...draft, fontSizePx: v[0] ?? draft.fontSizePx }
                      applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                    }}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>Line height</FieldLabel>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {draft.lineHeight.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    min={1.2}
                    max={2.2}
                    step={0.05}
                    value={[draft.lineHeight]}
                    onValueChange={(v) => {
                      const nextDraft = { ...draft, lineHeight: v[0] ?? draft.lineHeight }
                      applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                    }}
                  />
                </Field>
              </div>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Line width</FieldLabel>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draft.lineWidthPx}px
                  </span>
                </div>
                <Slider
                  min={520}
                  max={920}
                  step={20}
                  value={[draft.lineWidthPx]}
                  onValueChange={(v) => {
                    const nextDraft = { ...draft, lineWidthPx: v[0] ?? draft.lineWidthPx }
                    applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                  }}
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Letter spacing</FieldLabel>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draft.letterSpacingEm.toFixed(2)}em
                  </span>
                </div>
                <Slider
                  min={0}
                  max={0.12}
                  step={0.01}
                  value={[draft.letterSpacingEm]}
                  onValueChange={(v) => {
                    const nextDraft = { ...draft, letterSpacingEm: v[0] ?? draft.letterSpacingEm }
                    applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                  }}
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Allow live researcher adjustments</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {draft.editableByExperimenter
                      ? "Typography may be tuned during the live session."
                      : "Locked baseline — no typography changes during session."}
                  </p>
                </div>
                <Switch
                  checked={draft.editableByExperimenter}
                  onCheckedChange={(checked) => {
                    const nextDraft = { ...draft, editableByExperimenter: checked }
                    applyLocalDraft(nextDraft, deriveDraftSource(nextDraft))
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column: live preview ── */}
        <div className="xl:sticky xl:top-8 xl:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <p className="text-sm font-medium">Preview</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {FONT_LABELS[draft.fontFamily]} · {draft.fontSizePx}px · {draft.lineWidthPx}px
              </span>
            </div>
            {draft.markdown.trim().length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Enter markdown text to see a preview.
              </p>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto px-4 py-6 md:px-8">
                <div
                  className="mx-auto w-full"
                  style={{
                    maxWidth: `${draft.lineWidthPx}px`,
                    fontSize: `${draft.fontSizePx}px`,
                    lineHeight: draft.lineHeight,
                    letterSpacing: `${draft.letterSpacingEm}em`,
                    fontFamily: FONT_FAMILY_STYLES[draft.fontFamily],
                  }}
                >
                  <MarkdownReader blocks={previewBlocks} />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
