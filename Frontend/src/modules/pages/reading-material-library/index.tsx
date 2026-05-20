"use client"

import * as React from "react"
import { BookOpen, Download, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getErrorMessage } from "@/lib/error-utils"
import {
  buildReadingMaterialExport,
  downloadJsonFile,
  sanitizeExportFileName,
} from "@/lib/setup-portability"
import {
  useDeleteReadingMaterialSetupMutation,
  useGetExperimentSetupsQuery,
  useGetReadingMaterialSetupsQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
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
  const { data: savedSetups = [], isLoading } = useGetReadingMaterialSetupsQuery()
  const { data: experimentSetups = [] } = useGetExperimentSetupsQuery()
  const [deleteReadingMaterialSetup] = useDeleteReadingMaterialSetupMutation()
  const [getReadingMaterialSetupById] = useLazyGetReadingMaterialSetupByIdQuery()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [exportingId, setExportingId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const templateUsageCountByMaterialId = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const template of experimentSetups) {
      const materialIds = new Set(
        template.items
          .map((item) => item.sourceReadingMaterialSetupId)
          .filter((id): id is string => Boolean(id))
      )

      for (const materialId of materialIds) {
        counts.set(materialId, (counts.get(materialId) ?? 0) + 1)
      }
    }

    return counts
  }, [experimentSetups])

  const handleDelete = React.useCallback(
    async (id: string) => {
      setActionError(null)
      setDeletingId(id)
      try {
        await deleteReadingMaterialSetup(id).unwrap()
      } catch (error) {
        setActionError(getErrorMessage(error, "Could not delete that reading material."))
      } finally {
        setDeletingId(null)
      }
    },
    [deleteReadingMaterialSetup]
  )

  const handleExport = React.useCallback(
    async (setup: (typeof savedSetups)[number]) => {
      setActionError(null)
      setExportingId(setup.id)

      try {
        const fullSetup = await getReadingMaterialSetupById(setup.id).unwrap()
        downloadJsonFile(
          `${sanitizeExportFileName(fullSetup.name, "reading-material")}.reading-material.json`,
          buildReadingMaterialExport(fullSetup)
        )
      } catch (error) {
        setActionError(getErrorMessage(error, "Could not export that reading material."))
      } finally {
        setExportingId(null)
      }
    },
    [getReadingMaterialSetupById]
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

      {actionError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
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
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/reading-materials/setup?id=${setup.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={exportingId === setup.id}
                    onClick={() => void handleExport(setup)}
                    className="flex-1"
                  >
                    {exportingId === setup.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {exportingId === setup.id ? "Exporting..." : "Export"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={deletingId === setup.id}
                        className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === setup.id ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete reading material?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes <span className="font-medium">{setup.name}</span> from
                          the material library.
                          {templateUsageCountByMaterialId.get(setup.id)
                            ? ` ${templateUsageCountByMaterialId.get(setup.id)} experiment template${
                                templateUsageCountByMaterialId.get(setup.id) === 1 ? "" : "s"
                              } currently use copied content from this material and will remain available, but the library source link and quiz lookup will no longer resolve.`
                            : " No experiment templates currently reference this material."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void handleDelete(setup.id)}
                        >
                          Delete material
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
