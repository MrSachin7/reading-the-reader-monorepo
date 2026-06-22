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

// Turns the researcher-typed export name into a safe download filename, stripping
// characters that are illegal in filenames and making sure it carries the right
// extension for the format. Returns null when there is no usable name so callers
// fall back to the server-provided filename.
function buildFileNameFromUserInput(desiredName: string | undefined, format: ReplayExportFormat) {
  const trimmed = desiredName?.trim()
  if (!trimmed) {
    return null
  }

  const extension = `.${format}`
  // Strip characters that are illegal in Windows/macOS filenames, keeping spaces
  // and hyphens which researchers commonly use in export names.
  const sanitized = trimmed
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")

  if (!sanitized) {
    return null
  }

  return sanitized.toLowerCase().endsWith(extension) ? sanitized : `${sanitized}${extension}`
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
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

export async function downloadExperimentExport(
  format: ReplayExportFormat = "json",
  desiredName?: string,
) {
  const response = await fetch(`${API_BASE_URL}/experiment-session/export?format=${encodeURIComponent(format)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const blob = await response.blob()
  const fileName =
    buildFileNameFromUserInput(desiredName, format) ??
    getFileName(response.headers.get("content-disposition"), format)
  triggerBlobDownload(blob, fileName)
}

export async function downloadProcessedExperimentExport(desiredName?: string) {
  const response = await fetch(`${API_BASE_URL}/experiment-session/export/processed`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const blob = await response.blob()
  const fileName =
    buildFileNameFromUserInput(desiredName, "json") ??
    (response.headers.get("content-disposition")
      ? getFileName(response.headers.get("content-disposition"), "json")
      : "experiment-processed-export.json")
  triggerBlobDownload(blob, fileName)
}

// Posts a full replay export to the backend, which derives the processed report
// from it and streams the result back for download. The /from-replay endpoint
// reads the JSON straight from the request body and only accepts the full JSON
// export schema, so CSV payloads cannot be converted here.
async function postReplayForProcessedDownload(body: BodyInit, desiredName?: string) {
  const response = await fetch(`${API_BASE_URL}/experiment-session/export/processed/from-replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const blob = await response.blob()
  const fileName =
    buildFileNameFromUserInput(desiredName, "json") ??
    getFileName(response.headers.get("content-disposition"), "json")
  triggerBlobDownload(blob, fileName)
}

// Converts a full export JSON file picked from disk into its processed report.
export async function convertReplayExportToProcessed(file: File) {
  await postReplayForProcessedDownload(file)
}

// Converts a replay export already held in memory (e.g. a saved export fetched
// from the backend) into its processed report, naming the download after the
// saved export when a name is provided.
export async function convertReplayPayloadToProcessed(payload: unknown, desiredName?: string) {
  await postReplayForProcessedDownload(JSON.stringify(payload), desiredName)
}
