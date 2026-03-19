"use client";

import { Eye, Lock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay";
import { type FontTheme, FONTS } from "@/hooks/use-font-theme";
import { useReadingSettings } from "@/modules/pages/reading/lib/useReadingSettings";

const FONT_LABELS: Record<FontTheme, string> = {
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
};

export default function GazePage() {
  const {
    fontFamily,
    fontSizePx,
    lineWidthPx,
    lineHeight,
    letterSpacingEm,
    editableByExperimenter,
    experimentSetupName,
    setFontFamily,
    setFontSizePx,
    setLineWidthPx,
    setLineHeight,
    setLetterSpacingEm,
  } = useReadingSettings();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,120,160,0.16),rgba(0,0,0,0.94)_45%)]" />
      <LiveGazeOverlay statusVariant="panel" />

      <div className="absolute right-4 top-4 z-20 w-[360px] max-w-[calc(100vw-2rem)]">
        <Card className="border-white/10 bg-black/70 text-white backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {editableByExperimenter ? (
                <Eye className="h-4 w-4 text-emerald-300" />
              ) : (
                <Lock className="h-4 w-4 text-amber-300" />
              )}
              Experimenter controls
            </CardTitle>
            <CardDescription className="text-white/70">
              {experimentSetupName ? `Reading material: ${experimentSetupName}` : "No reading material setup applied."}
            </CardDescription>
            <CardDescription className="text-white/70">
              {editableByExperimenter
                ? "Live editing is enabled for this session."
                : "Live editing is disabled. Controls are read-only."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel className="text-white">Font family</FieldLabel>
              <Select
                value={fontFamily}
                onValueChange={(value) => setFontFamily(value as FontTheme)}
                disabled={!editableByExperimenter}
              >
                <SelectTrigger className="w-full border-white/20 bg-white/5 text-white">
                  <SelectValue placeholder="Choose a font" />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {FONT_LABELS[font]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel className="text-white">Font size</FieldLabel>
                <span className="text-xs text-white/70">{fontSizePx}px</span>
              </div>
              <Slider
                min={16}
                max={22}
                step={2}
                value={[fontSizePx]}
                disabled={!editableByExperimenter}
                onValueChange={(value) => setFontSizePx(value[0] ?? fontSizePx)}
              />
            </Field>

            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel className="text-white">Line width</FieldLabel>
                <span className="text-xs text-white/70">{lineWidthPx}px</span>
              </div>
              <Slider
                min={560}
                max={820}
                step={120}
                value={[lineWidthPx]}
                disabled={!editableByExperimenter}
                onValueChange={(value) => setLineWidthPx(value[0] ?? lineWidthPx)}
              />
            </Field>

            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel className="text-white">Line height</FieldLabel>
                <span className="text-xs text-white/70">{lineHeight.toFixed(2)}</span>
              </div>
              <Slider
                min={1.2}
                max={2.2}
                step={0.05}
                value={[lineHeight]}
                disabled={!editableByExperimenter}
                onValueChange={(value) => setLineHeight(value[0] ?? lineHeight)}
              />
            </Field>

            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel className="text-white">Letter spacing</FieldLabel>
                <span className="text-xs text-white/70">{letterSpacingEm.toFixed(2)}em</span>
              </div>
              <Slider
                min={0}
                max={0.12}
                step={0.01}
                value={[letterSpacingEm]}
                disabled={!editableByExperimenter}
                onValueChange={(value) => setLetterSpacingEm(value[0] ?? letterSpacingEm)}
              />
            </Field>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
