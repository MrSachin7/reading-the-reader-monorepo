import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react"

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5190/api"

const rawBaseQuery = fetchBaseQuery({ baseUrl })

function serializeBody(body: unknown) {
  if (body instanceof FormData) {
    return Object.fromEntries(
      Array.from(body.entries()).map(([key, value]) => [
        key,
        value instanceof File ? { name: value.name, size: value.size, type: value.type } : value,
      ])
    )
  }

  return body
}

const loggingBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const request = typeof args === "string" ? { url: args, method: "GET" } : args

  console.log("REST Request:", {
    url: `${baseUrl}${request.url}`,
    method: request.method ?? "GET",
    params: "params" in request ? request.params : undefined,
    body: "body" in request ? serializeBody(request.body) : undefined,
  })

  const result = await rawBaseQuery(args, api, extraOptions)
  const response = result.meta?.response

  console.log("REST Response:", {
    url: response?.url ?? `${baseUrl}${request.url}`,
    method: request.method ?? "GET",
    status: response?.status ?? null,
    ok: response?.ok ?? false,
    data: "data" in result ? result.data : undefined,
    error: "error" in result ? result.error : undefined,
  })

  return result
}

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: loggingBaseQuery,
  tagTypes: [
    "Eyetracker",
    "Experiment",
    "ReadingMaterialSetup",
    "CalibrationSettings",
    "ReaderShellSettings",
    "SensingModeSettings",
    "ReplayExport",
    "InterventionModule",
  ],
  endpoints: () => ({}),
})
