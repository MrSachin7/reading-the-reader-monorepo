"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { FontThemeProvider } from "@/hooks/use-font-theme";
import { PaletteThemeProvider } from "@/hooks/use-palette-theme";
import { AppErrorBoundary } from "@/components/error/app-error-boundary";
import { ErrorRuntimeMonitor } from "@/components/error/error-runtime-monitor";
import { GlobalErrorCenter } from "@/components/error/global-error-center";
import { normalizeAppError } from "@/lib/error-utils";
import { useAppStore } from "@/redux/hooks";
import { ReduxProvider } from "@/redux/redux-provider";
import { registerErrorReporter } from "@/redux/error-reporter";
import { pushError } from "@/redux/slices/app-slice";

function ProviderShell({ children }: { children: React.ReactNode }) {
  const store = useAppStore()

  React.useEffect(() => {
    registerErrorReporter(store.dispatch)
    return () => registerErrorReporter(null)
  }, [store])

  return (
    <AppErrorBoundary
      onError={(error, info) => {
        store.dispatch(
          pushError(
            normalizeAppError(error, {
              title: "Interface crash",
              source: "runtime",
              details: info.componentStack || error.stack || null,
            })
          )
        )
      }}
    >
      <ErrorRuntimeMonitor />
      {children}
      <GlobalErrorCenter />
    </AppErrorBoundary>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <FontThemeProvider>
          <PaletteThemeProvider>
            <ProviderShell>{children}</ProviderShell>
          </PaletteThemeProvider>
        </FontThemeProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
