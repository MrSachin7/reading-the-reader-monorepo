"use client"

import * as React from "react"
import { BookOpen, Copy, LoaderCircle, Plus } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getErrorMessage } from "@/lib/error-utils"
import {
  type ReadingMaterialSetup,
  useCreateReadingMaterialSetupMutation,
  useGetReadingMaterialSetupsQuery,
} from "@/redux"

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function describeControlState(editableByExperimenter: boolean) {
  return editableByExperimenter ? "Live-adjustable" : "Locked baseline"
}

export default function ReadingMaterialLibraryPage() {
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null)
  const { data: savedSetups = [], isLoading, refetch } = useGetReadingMaterialSetupsQuery()
  const [createReadingMaterialSetup, { isLoading: isDuplicating }] =
    useCreateReadingMaterialSetupMutation()

  const handleDuplicate = React.useCallback(
    async (setup: ReadingMaterialSetup) => {
      setDuplicateError(null)
      try {
        await createReadingMaterialSetup({
          name: `${setup.name} copy`,
          title: setup.title,
          markdown: setup.markdown,
          researcherQuestions: setup.researcherQuestions,
          fontFamily: setup.fontFamily,
          fontSizePx: setup.fontSizePx,
          lineWidthPx: setup.lineWidthPx,
          lineHeight: setup.lineHeight,
          letterSpacingEm: setup.letterSpacingEm,
          editableByExperimenter: setup.editableByExperimenter,
        }).unwrap()
        void refetch()
      } catch (error) {
        setDuplicateError(getErrorMessage(error, "Could not duplicate that material."))
      }
    },
    [createReadingMaterialSetup, refetch]
  )

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Material Library</Badge>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Reading materials
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  Reusable Markdown baselines you can assemble into experiment templates.
                </p>
              </div>
            </div>
            <Link href="/reading-materials/setup">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New material
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {duplicateError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {duplicateError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading saved materials...
        </div>
      ) : savedSetups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed p-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No saved materials yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first reading material to use in experiment templates.
            </p>
          </div>
          <Link href="/reading-materials/setup">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create first material
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {savedSetups.map((setup) => (
            <Card key={setup.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                <div className="flex-1 space-y-1.5">
                  <p className="font-semibold leading-tight">{setup.name}</p>
                  <p className="text-sm text-muted-foreground">{setup.title}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                      {describeControlState(setup.editableByExperimenter)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved {formatDate(setup.updatedAtUnixMs)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/reading-materials/setup?id=${setup.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDuplicating}
                    onClick={() => void handleDuplicate(setup)}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
