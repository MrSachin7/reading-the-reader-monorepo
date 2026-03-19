"use client";

import * as React from "react";

export const PALETTES = ["default", "sepia", "high-contrast"] as const;
export type Palette = (typeof PALETTES)[number];

type PaletteThemeContextValue = {
  palette: Palette;
  setPalette: (palette: Palette) => void;
};

const PaletteThemeContext = React.createContext<PaletteThemeContextValue | null>(
  null,
);

const PALETTE_STORAGE_KEY = "app-palette";

function isPalette(value: string | null): value is Palette {
  return !!value && PALETTES.includes(value as Palette);
}

export function PaletteThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [palette, setPalette] = React.useState<Palette>("default");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    if (isPalette(stored)) {
      setPalette(stored);
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  }, [palette]);

  const value = React.useMemo(
    () => ({
      palette,
      setPalette,
    }),
    [palette],
  );

  return (
    <PaletteThemeContext.Provider value={value}>
      {children}
    </PaletteThemeContext.Provider>
  );
}

export function usePaletteTheme() {
  const context = React.useContext(PaletteThemeContext);
  if (!context) {
    throw new Error("usePaletteTheme must be used within PaletteThemeProvider");
  }
  return context;
}

