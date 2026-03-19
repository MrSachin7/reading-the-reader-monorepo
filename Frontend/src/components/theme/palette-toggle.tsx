"use client";

import * as React from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PALETTES,
  type Palette,
  usePaletteTheme,
} from "@/hooks/use-palette-theme";
import { cn } from "@/lib/utils";

const LABELS: Record<Palette, string> = {
  default: "Default",
  sepia: "Sepia",
  "high-contrast": "High Contrast",
};

type PaletteToggleProps = {
  className?: string;
  appearance?: "default" | "flat";
  value?: Palette;
  onValueChange?: (palette: Palette) => void;
};

export function PaletteToggle({
  className,
  appearance = "default",
  value,
  onValueChange,
}: PaletteToggleProps) {
  const { palette, setPalette } = usePaletteTheme();

  return (
    <ToggleGroup
      type="single"
      value={value ?? palette}
      onValueChange={(value) => {
        if (value) {
          const nextPalette = value as Palette
          setPalette(nextPalette);
          onValueChange?.(nextPalette)
        }
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className={cn(
        appearance === "flat"
          ? "rounded-md border-0 bg-transparent p-0 shadow-none"
          : "rounded-md border border-border bg-background p-1",
        className,
      )}
      aria-label="Color palette"
    >
      {PALETTES.map((item) => {
        return (
          <ToggleGroupItem
            key={item}
            value={item}
            aria-label={LABELS[item]}
            className="px-2.5 text-xs"
          >
            {LABELS[item]}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
