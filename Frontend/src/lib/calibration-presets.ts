import type { CalibrationPointDefinition, CalibrationPattern } from "@/lib/calibration"

const OUTER_MIN = 0.1
const OUTER_CENTER = 0.5
const OUTER_MAX = 0.9
const INNER_HORIZONTAL_MIN = 0.34
const INNER_HORIZONTAL_MAX = 0.66
const INNER_VERTICAL_MIN = 0.24
const INNER_VERTICAL_MAX = 0.68

const NINE_POINT: CalibrationPointDefinition[] = [
  { pointId: "center", label: "Center", x: OUTER_CENTER, y: OUTER_CENTER },
  { pointId: "top-left", label: "Top left", x: OUTER_MIN, y: OUTER_MIN },
  { pointId: "top-center", label: "Top center", x: OUTER_CENTER, y: OUTER_MIN },
  { pointId: "top-right", label: "Top right", x: OUTER_MAX, y: OUTER_MIN },
  { pointId: "right-center", label: "Right center", x: OUTER_MAX, y: OUTER_CENTER },
  { pointId: "bottom-right", label: "Bottom right", x: OUTER_MAX, y: OUTER_MAX },
  { pointId: "bottom-center", label: "Bottom center", x: OUTER_CENTER, y: OUTER_MAX },
  { pointId: "bottom-left", label: "Bottom left", x: OUTER_MIN, y: OUTER_MAX },
  { pointId: "left-center", label: "Left center", x: OUTER_MIN, y: OUTER_CENTER },
]

const THIRTEEN_POINT: CalibrationPointDefinition[] = [
  ...NINE_POINT,
  { pointId: "upper-inner-left", label: "Upper inner left", x: INNER_HORIZONTAL_MIN, y: INNER_VERTICAL_MIN },
  { pointId: "upper-inner-right", label: "Upper inner right", x: INNER_HORIZONTAL_MAX, y: INNER_VERTICAL_MIN },
  { pointId: "lower-inner-right", label: "Lower inner right", x: INNER_HORIZONTAL_MAX, y: INNER_VERTICAL_MAX },
  { pointId: "lower-inner-left", label: "Lower inner left", x: INNER_HORIZONTAL_MIN, y: INNER_VERTICAL_MAX },
]

const SIXTEEN_POINT: CalibrationPointDefinition[] = [
  ...THIRTEEN_POINT,
  { pointId: "upper-inner-center", label: "Upper inner center", x: OUTER_CENTER, y: INNER_VERTICAL_MIN },
  { pointId: "middle-inner-left", label: "Middle inner left", x: INNER_HORIZONTAL_MIN, y: OUTER_CENTER },
  { pointId: "middle-inner-right", label: "Middle inner right", x: INNER_HORIZONTAL_MAX, y: OUTER_CENTER },
]

const PRESETS = {
  9: {
    pattern: "screen-based-nine-point",
    points: NINE_POINT,
  },
  13: {
    pattern: "screen-based-thirteen-point",
    points: THIRTEEN_POINT,
  },
  16: {
    pattern: "screen-based-sixteen-point",
    points: SIXTEEN_POINT,
  },
} satisfies Record<number, { pattern: CalibrationPattern; points: CalibrationPointDefinition[] }>

export function getCalibrationPreset(pointCount: number) {
  return PRESETS[pointCount as keyof typeof PRESETS] ?? null
}

export const SUPPORTED_CALIBRATION_POINT_COUNTS = Object.keys(PRESETS).map((value) => Number(value))
