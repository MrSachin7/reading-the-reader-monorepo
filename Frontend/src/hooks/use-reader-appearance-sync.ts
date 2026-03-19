"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { useFontTheme } from "@/hooks/use-font-theme"
import { usePaletteTheme } from "@/hooks/use-palette-theme"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"

export function useReaderAppearanceSync(appearance: ReaderAppearanceSettings | null | undefined) {
  const { theme, setTheme } = useTheme()
  const { font, setFont } = useFontTheme()
  const { palette, setPalette } = usePaletteTheme()

  useEffect(() => {
    if (!appearance) {
      return
    }

    if (theme !== appearance.themeMode) {
      setTheme(appearance.themeMode)
    }
  }, [appearance, setTheme, theme])

  useEffect(() => {
    if (!appearance) {
      return
    }

    if (font !== appearance.appFont) {
      setFont(appearance.appFont)
    }
  }, [appearance, font, setFont])

  useEffect(() => {
    if (!appearance) {
      return
    }

    if (palette !== appearance.palette) {
      setPalette(appearance.palette)
    }
  }, [appearance, palette, setPalette])
}
