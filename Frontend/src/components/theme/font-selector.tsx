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
};

export function FontSelector({ className }: FontSelectorProps) {
  const { font, setFont } = useFontTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Select
      value={mounted ? font : "geist"}
      onValueChange={(value) => setFont(value as FontTheme)}
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

