import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"
import { baseApi } from "@/redux/api/base-api"

export const interventionModulesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterventionModules: builder.query<InterventionModuleDescriptor[], void>({
      query: () => ({
        url: "/intervention-modules",
        method: "GET",
      }),
      providesTags: ["InterventionModule"],
    }),
  }),
})

export const { useGetInterventionModulesQuery } = interventionModulesApi
