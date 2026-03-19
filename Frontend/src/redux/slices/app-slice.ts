import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AppErrorRecord } from "@/lib/error-utils"

type AppState = {
  initialized: boolean
  errors: AppErrorRecord[]
}

const initialState: AppState = {
  initialized: false,
  errors: [],
}

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload
    },
    pushError: (state, action: PayloadAction<AppErrorRecord>) => {
      const nextError = action.payload
      const existingIndex = state.errors.findIndex(
        (error) =>
          error.fingerprint === nextError.fingerprint &&
          nextError.timestamp - error.timestamp < 4_000
      )

      if (existingIndex >= 0) {
        state.errors[existingIndex] = nextError
      } else {
        state.errors.unshift(nextError)
      }

      state.errors = state.errors.slice(0, 6)
    },
    dismissError: (state, action: PayloadAction<string>) => {
      state.errors = state.errors.filter((error) => error.id !== action.payload)
    },
    clearErrors: (state) => {
      state.errors = []
    },
  },
})

export const { clearErrors, dismissError, pushError, setInitialized } = appSlice.actions
export default appSlice.reducer
