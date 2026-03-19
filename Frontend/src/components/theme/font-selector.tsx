"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONTS, type FontTheme, useFontTheme } from "@/hooks/use-font-theme";

const FONT_LABELS: Record<FontTheme, string> = {
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
};

type FontSelectorProps = {
  className?: string;
  value?: FontTheme;
  onValueChange?: (font: FontTheme) => void;
}

export function FontSelector({ className, value, onValueChange }: FontSelectorProps) {
  const { font, setFont } = useFontTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Select
      value={mounted ? value ?? font : "geist"}
      onValueChange={(value) => {
        const nextFont = value as FontTheme
        setFont(nextFont)
        onValueChange?.(nextFont)
      }}
      disabled={!mounted}
    >
      <SelectTrigger className={className ?? "w-[180px]"} size="sm">
        <SelectValue placeholder="Select font" />
      </SelectTrigger>
      <SelectContent>
        {FONTS.map((item) => (
          <SelectItem key={item} value={item}>
            {FONT_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

