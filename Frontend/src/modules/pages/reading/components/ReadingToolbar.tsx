"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
} from "@/modules/pages/reading/lib/useReadingSettings";

type ReadingToolbarProps = {
  estimatedTimeLabel: string;
  experimentSetupName: string | null;
  fontSizePx: number;
  lineWidthPx: number;
  showBackButton?: boolean;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  onIncreaseWidth: () => void;
  onDecreaseWidth: () => void;
  onReset: () => void;
  onEnterFocus: () => void;
};

export function ReadingToolbar({
  estimatedTimeLabel,
  experimentSetupName,
  fontSizePx,
  lineWidthPx,
  showBackButton = true,
  onIncreaseFont,
  onDecreaseFont,
  onIncreaseWidth,
  onDecreaseWidth,
  onReset,
  onEnterFocus,
}: ReadingToolbarProps) {
  const canDecreaseFont = fontSizePx > FONT_SIZE_MIN;
  const canIncreaseFont = fontSizePx < FONT_SIZE_MAX;
  const canDecreaseWidth = lineWidthPx > LINE_WIDTH_MIN;
  const canIncreaseWidth = lineWidthPx < LINE_WIDTH_MAX;

  return (
    <div className="sticky top-0 z-20 border-b bg-card/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        {showBackButton ? (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back</Link>
            </Button>

            <Separator orientation="vertical" className="hidden h-6 md:block" />
          </>
        ) : null}

        <p className="text-sm text-muted-foreground">{estimatedTimeLabel}</p>

        {experimentSetupName ? (
          <>
            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <p className="text-sm text-muted-foreground">
              Material: {experimentSetupName}
            </p>
          </>
        ) : null}

        <Separator orientation="vertical" className="hidden h-6 md:block" />

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={onDecreaseFont}
            disabled={!canDecreaseFont}
            aria-label="Decrease font size"
          >
            A-
          </Button>
          <span className="w-16 text-center text-xs text-muted-foreground">{fontSizePx}px</span>
          <Button
            variant="outline"
            size="xs"
            onClick={onIncreaseFont}
            disabled={!canIncreaseFont}
            aria-label="Increase font size"
          >
            A+
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={onDecreaseWidth}
            disabled={!canDecreaseWidth}
            aria-label="Decrease line width"
          >
            [
          </Button>
          <span className="w-16 text-center text-xs text-muted-foreground">{lineWidthPx}px</span>
          <Button
            variant="outline"
            size="xs"
            onClick={onIncreaseWidth}
            disabled={!canIncreaseWidth}
            aria-label="Increase line width"
          >
            ]
          </Button>
        </div>

        <div className="ml-auto" />

        <Button variant="secondary" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button size="sm" onClick={onEnterFocus}>
          Focus
        </Button>
      </div>
    </div>
  );
}
