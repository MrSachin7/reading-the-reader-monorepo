import { baseApi } from "@/redux/api/base-api"
import type { CalibrationSessionSnapshot, CalibrationSettingsSnapshot } from "@/lib/calibration"

export const calibrationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalibrationState: builder.query<CalibrationSessionSnapshot, void>({
      query: () => "/calibration",
    }),
    getCalibrationSettings: builder.query<CalibrationSettingsSnapshot, void>({
      query: () => "/calibration/settings",
      providesTags: ["CalibrationSettings"],
    }),
    startCalibration: builder.mutation<CalibrationSessionSnapshot, void>({
      query: () => ({
        url: "/calibration/start",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    collectCalibrationPoint: builder.mutation<CalibrationSessionSnapshot, { pointId: string }>({
      query: ({ pointId }) => ({
        url: "/calibration/collect",
        method: "POST",
        body: {
          PointId: pointId,
        },
      }),
      invalidatesTags: ["Experiment"],
    }),
    finishCalibration: builder.mutation<CalibrationSessionSnapshot, void>({
      query: () => ({
        url: "/calibration/finish",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    cancelCalibration: builder.mutation<CalibrationSessionSnapshot, void>({
      query: () => ({
        url: "/calibration/cancel",
        method: "POST",
      }),
      invalidatesTags: ["Experiment"],
    }),
    updateCalibrationSettings: builder.mutation<CalibrationSettingsSnapshot, { presetPointCount: number }>({
      query: ({ presetPointCount }) => ({
        url: "/calibration/settings",
        method: "PUT",
        body: {
          PresetPointCount: presetPointCount,
        },
      }),
      invalidatesTags: ["CalibrationSettings"],
    }),
  }),
})

export const {
  useGetCalibrationStateQuery,
  useGetCalibrationSettingsQuery,
  useStartCalibrationMutation,
  useCollectCalibrationPointMutation,
  useFinishCalibrationMutation,
  useCancelCalibrationMutation,
  useUpdateCalibrationSettingsMutation,
} = calibrationApi
