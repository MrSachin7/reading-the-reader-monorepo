"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PALETTES, type Palette, usePaletteTheme } from "@/hooks/use-palette-theme";
import { cn } from "@/lib/utils";

type ThemePaletteSelectorProps = {
  className?: string;
};

const MODE_LABELS: Record<"light" | "dark", string> = {
  light: "Light",
  dark: "Dark",
};

const PALETTE_LABELS: Record<Palette, string> = {
  default: "Default",
  sepia: "Sepia",
  "high-contrast": "High Contrast",
};

export function ThemePaletteSelector({ className }: ThemePaletteSelectorProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { palette, setPalette } = usePaletteTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const modeValue: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="grid gap-1.5">
        <Label htmlFor="mode-selector">Mode</Label>
        <Select
          value={mounted ? modeValue : "light"}
          onValueChange={(value) => setTheme(value as "light" | "dark")}
          disabled={!mounted}
        >
          <SelectTrigger id="mode-selector" className="w-[180px]">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">{MODE_LABELS.light}</SelectItem>
            <SelectItem value="dark">{MODE_LABELS.dark}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="palette-selector">Palette</Label>
        <Select
          value={palette}
          onValueChange={(value) => setPalette(value as Palette)}
          disabled={!mounted}
        >
          <SelectTrigger id="palette-selector" className="w-[180px]">
            <SelectValue placeholder="Select palette" />
          </SelectTrigger>
          <SelectContent>
            {PALETTES.map((item) => (
              <SelectItem key={item} value={item}>
                {PALETTE_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

