import { baseApi } from "@/redux/api/base-api"

export type SaveParticipantPayload = {
  name: string
  age: number
  sex: string
  existingEyeCondition: string
  readingProficiency: string
}

export const participantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    saveParticipant: builder.mutation<void, SaveParticipantPayload>({
      query: ({ name, age, sex, existingEyeCondition, readingProficiency }) => ({
        url: "/participant",
        method: "POST",
        body: {
          Name: name,
          Age: age,
          Sex: sex,
          ExistingEyeCondition: existingEyeCondition,
          ReadingProficiency: readingProficiency,
        },
      }),
    }),
  }),
})

export const { useSaveParticipantMutation } = participantApi
