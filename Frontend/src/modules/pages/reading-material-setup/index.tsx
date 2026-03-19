"use client"

import * as React from "react"
import { BookOpen, Check, Eye, FilePlus2, LoaderCircle, Lock, Plus, Save, SlidersHorizontal } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { applyReadingPresentationSettings, useReadingSettings } from "@/modules/pages/reading/lib/useReadingSettings"
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
    syncReadingSession(defaultDraft, "preset")
  }, [syncReadingSession])

  const handleSave = React.useCallback(async () => {
    setSaveError(null)

    try {
      const response = selectedSetupId
        ? await updateReadingMaterialSetup({
            id: selectedSetupId,
            body: draft,
          }).unwrap()
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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="px-6 py-6 md:px-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Reading material setup</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Create a reading material setup before the reading session starts.
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Save text, questions, and presentation settings together as one setup.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-xl">Saved reading material setups</CardTitle>
                <CardDescription>Reusable cards for step 4.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleStartNew}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectionError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {selectionError}
                </div>
              ) : null}

              {isLoadingSetups ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Loading reading material setups...
                </div>
              ) : savedSetups.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No saved setups yet.
                </div>
              ) : (
                savedSetups.map((setup) => (
                  <button
                    key={setup.id}
                    type="button"
                    onClick={() => void handleLoadSavedSetup(setup.id)}
                    disabled={isLoadingSelectedSetup}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedSetupId === setup.id
                        ? "border-primary bg-accent/50"
                        : "bg-card hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{setup.name}</p>
                        <p className="text-xs text-muted-foreground">{setup.title}</p>
                        <p className="text-xs text-muted-foreground">Saved {formatDate(setup.updatedAtUnixMs)}</p>
                      </div>
                      {selectedSetupId === setup.id ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Reading text</CardTitle>
              <CardDescription>Use the markdown below as the live preview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSetupId(null)
                    const nextDraft = {
                      ...draft,
                      title: defaultDraft.title,
                      markdown: defaultDraft.markdown,
                    }
                    setDraft(nextDraft)
                    syncReadingSession(nextDraft, "preset")
                  }}
                  className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                    isBuiltInSelected
                      ? "border-primary bg-accent/50"
                      : "bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      Built-in text
                    </div>
                    <h3 className="text-lg font-semibold">{defaultDraft.title}</h3>
                    <p className="text-sm text-muted-foreground">{presetExcerpt}...</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSetupId(null)
                    const nextDraft = {
                      ...draft,
                      title:
                        draft.title.trim().length > 0 && draft.title !== defaultDraft.title
                          ? draft.title
                          : "Untitled text",
                      markdown:
                        draft.markdown === defaultDraft.markdown
                          ? ""
                          : draft.markdown,
                    }
                    setDraft(nextDraft)
                    syncReadingSession(nextDraft, "custom")
                  }}
                  className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                    isCustomSelected
                      ? "border-primary bg-accent/50"
                      : "bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FilePlus2 className="h-4 w-4" />
                      Custom markdown
                    </div>
                    <h3 className="text-lg font-semibold">Paste a temporary text</h3>
                    <p className="text-sm text-muted-foreground">The editor below is the preview source.</p>
                  </div>
                </button>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reading-material-name">Setup name</FieldLabel>
                  <Input
                    id="reading-material-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Enter reading material setup name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="reading-material-title">Text title</FieldLabel>
                  <Input
                    id="reading-material-title"
                    value={draft.title}
                    onChange={(event) => {
                      const nextDraft = { ...draft, title: event.target.value }
                      setDraft(nextDraft)
                      syncReadingSession(nextDraft, "custom")
                    }}
                    placeholder="Enter a title for this reading text"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="reading-material-text">Markdown text</FieldLabel>
                  <Textarea
                    id="reading-material-text"
                    value={draft.markdown}
                    onChange={(event) => {
                      const nextDraft = { ...draft, markdown: event.target.value }
                      setDraft(nextDraft)
                      syncReadingSession(nextDraft, "custom")
                    }}
                    className="min-h-56 resize-y"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="reading-material-questions">Researcher questions</FieldLabel>
                  <Textarea
                    id="reading-material-questions"
                    value={draft.researcherQuestions}
                    onChange={(event) => {
                      const nextDraft = { ...draft, researcherQuestions: event.target.value }
                      setDraft(nextDraft)
                      syncReadingSession(nextDraft, "custom")
                    }}
                    className="min-h-32 resize-y"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Presentation settings</CardTitle>
              </div>
              <CardDescription>Applied together with the text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {saveError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {saveError}
                </div>
              ) : null}

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="material-font-family">Font family</FieldLabel>
                  <Select
                    value={draft.fontFamily}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, fontFamily: value as FontTheme }))
                    }
                  >
                    <SelectTrigger id="material-font-family" className="w-full">
                      <SelectValue placeholder="Choose a font" />
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

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Font size</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.fontSizePx}px</span>
                  </div>
                  <Slider
                    min={14}
                    max={28}
                    step={1}
                    value={[draft.fontSizePx]}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, fontSizePx: value[0] ?? current.fontSizePx }))
                    }
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Line width</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.lineWidthPx}px</span>
                  </div>
                  <Slider
                    min={520}
                    max={920}
                    step={20}
                    value={[draft.lineWidthPx]}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, lineWidthPx: value[0] ?? current.lineWidthPx }))
                    }
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Line height</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.lineHeight.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={1.2}
                    max={2.2}
                    step={0.05}
                    value={[draft.lineHeight]}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, lineHeight: value[0] ?? current.lineHeight }))
                    }
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Letter spacing</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {draft.letterSpacingEm.toFixed(2)}em
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.12}
                    step={0.01}
                    value={[draft.letterSpacingEm]}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        letterSpacingEm: value[0] ?? current.letterSpacingEm,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {draft.editableByExperimenter ? (
                          <Eye className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <FieldLabel className="text-sm">Editable later by experimenter</FieldLabel>
                      </div>
                      <FieldDescription>
                        If enabled, the second-screen experimenter may adjust these values live during the reading session.
                      </FieldDescription>
                    </div>
                    <Switch
                      checked={draft.editableByExperimenter}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, editableByExperimenter: checked }))
                      }
                    />
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Save reading material setup</CardTitle>
              <CardDescription>Save the whole setup as a single record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-medium">Current combination</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Text: {draft.title.trim().length > 0 ? draft.title : "Untitled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Questions: {draft.researcherQuestions.trim().length > 0 ? "Added" : "None"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Font: {FONT_LABELS[draft.fontFamily]} {draft.fontSizePx}px
                </p>
              </div>

              <Button
                onClick={() => void handleSave()}
                className="w-full"
                disabled={
                  isSaving ||
                  draft.name.trim().length === 0 ||
                  draft.title.trim().length === 0 ||
                  draft.markdown.trim().length === 0
                }
              >
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {selectedSetupId ? "Update reading material setup" : "Save reading material setup"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-8 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl">Live preview</CardTitle>
              <CardDescription>Uses the main markdown text.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border bg-background">
                <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                  Participant reading preview
                </div>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
