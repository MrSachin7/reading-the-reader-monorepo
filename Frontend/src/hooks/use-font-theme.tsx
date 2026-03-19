"use client";

import * as React from "react";

export const FONTS = ["geist", "inter", "space-grotesk", "merriweather"] as const;
export type FontTheme = (typeof FONTS)[number];

type FontThemeContextValue = {
  font: FontTheme;
  setFont: (font: FontTheme) => void;
};

const FontThemeContext = React.createContext<FontThemeContextValue | null>(null);

const FONT_STORAGE_KEY = "app-font";

function isFontTheme(value: string | null): value is FontTheme {
  return !!value && FONTS.includes(value as FontTheme);
}

export function FontThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [font, setFont] = React.useState<FontTheme>("geist");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
    if (isFontTheme(stored)) {
      setFont(stored);
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
    window.localStorage.setItem(FONT_STORAGE_KEY, font);
  }, [font]);

  const value = React.useMemo(
    () => ({
      font,
      setFont,
    }),
    [font],
  );

  return (
    <FontThemeContext.Provider value={value}>{children}</FontThemeContext.Provider>
  );
}

export function useFontTheme() {
  const context = React.useContext(FontThemeContext);
  if (!context) {
    throw new Error("useFontTheme must be used within FontThemeProvider");
  }
  return context;
}

