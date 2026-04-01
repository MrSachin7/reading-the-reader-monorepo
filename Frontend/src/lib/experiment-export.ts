import type { ReplayExportFormat } from "@/redux"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5190/api"

function getFallbackFileName(format: ReplayExportFormat) {
  return `experiment-export.${format}`
}

function getFileName(contentDisposition: string | null, format: ReplayExportFormat) {
  if (!contentDisposition) {
    return getFallbackFileName(format)
  }

  const match = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition)
  return match?.[1] ?? getFallbackFileName(format)
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string }
    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message
    }
  } catch {
    // Ignore non-JSON errors and fall back to status text.
  }

  return response.statusText || "Could not download the experiment export."
}

export async function downloadExperimentExport(format: ReplayExportFormat = "json") {
  const response = await fetch(`${API_BASE_URL}/experiment-session/export?format=${encodeURIComponent(format)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = getFileName(response.headers.get("content-disposition"), format)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
