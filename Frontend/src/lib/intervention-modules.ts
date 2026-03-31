export const INTERVENTION_VALUE_KINDS = ["string", "integer", "number", "boolean"] as const
export type InterventionValueKind = (typeof INTERVENTION_VALUE_KINDS)[number]

export type InterventionModuleParameterOption = {
  value: string
  displayName: string
  description: string | null
}

export type InterventionModuleParameter = {
  key: string
  displayName: string
  description: string
  valueKind: InterventionValueKind
  required: boolean
  defaultValue: string | null
  unit: string | null
  minValue: number | null
  maxValue: number | null
  step: number | null
  options: InterventionModuleParameterOption[]
}

export type InterventionModuleDescriptor = {
  moduleId: string
  displayName: string
  description: string
  group: string
  sortOrder: number
  parameters: InterventionModuleParameter[]
}

export type InterventionParameterValues = Record<string, string | null>

export function cloneInterventionParameters(
  parameters: InterventionParameterValues | null | undefined
): InterventionParameterValues | null {
  return parameters ? { ...parameters } : null
}

export const FALLBACK_INTERVENTION_MODULES: InterventionModuleDescriptor[] = [
  {
    moduleId: "font-family",
    displayName: "Font family",
    description: "Changes the participant reading font family.",
    group: "presentation",
    sortOrder: 10,
    parameters: [
      {
        key: "fontFamily",
        displayName: "Font family",
        description: "Typeface used for the participant reading surface.",
        valueKind: "string",
        required: true,
        defaultValue: "merriweather",
        unit: null,
        minValue: null,
        maxValue: null,
        step: null,
        options: [
          { value: "geist", displayName: "Geist", description: null },
          { value: "inter", displayName: "Inter", description: null },
          { value: "space-grotesk", displayName: "Space Grotesk", description: null },
          { value: "merriweather", displayName: "Merriweather", description: null },
        ],
      },
    ],
  },
  {
    moduleId: "participant-edit-lock",
    displayName: "Participant edit lock",
    description: "Locks or unlocks participant-side presentation changes.",
    group: "presentation",
    sortOrder: 15,
    parameters: [
      {
        key: "locked",
        displayName: "Participant editing locked",
        description: "Whether the participant can change presentation controls locally.",
        valueKind: "boolean",
        required: true,
        defaultValue: "false",
        unit: null,
        minValue: null,
        maxValue: null,
        step: null,
        options: [],
      },
    ],
  },
  {
    moduleId: "font-size",
    displayName: "Font size",
    description: "Changes the participant reading font size.",
    group: "presentation",
    sortOrder: 20,
    parameters: [
      {
        key: "fontSizePx",
        displayName: "Font size",
        description: "Font size in pixels for participant reading text.",
        valueKind: "integer",
        required: true,
        defaultValue: "18",
        unit: "px",
        minValue: 14,
        maxValue: 28,
        step: 2,
        options: [],
      },
    ],
  },
  {
    moduleId: "line-width",
    displayName: "Line width",
    description: "Changes the participant reading line width.",
    group: "presentation",
    sortOrder: 30,
    parameters: [
      {
        key: "lineWidthPx",
        displayName: "Line width",
        description: "Maximum reading line width in pixels.",
        valueKind: "integer",
        required: true,
        defaultValue: "680",
        unit: "px",
        minValue: 520,
        maxValue: 920,
        step: 20,
        options: [],
      },
    ],
  },
  {
    moduleId: "line-height",
    displayName: "Line height",
    description: "Changes the participant reading line height.",
    group: "presentation",
    sortOrder: 40,
    parameters: [
      {
        key: "lineHeight",
        displayName: "Line height",
        description: "Line height multiplier for participant reading text.",
        valueKind: "number",
        required: true,
        defaultValue: "1.8",
        unit: null,
        minValue: 1.2,
        maxValue: 2.2,
        step: 0.05,
        options: [],
      },
    ],
  },
  {
    moduleId: "letter-spacing",
    displayName: "Letter spacing",
    description: "Changes the participant reading letter spacing.",
    group: "presentation",
    sortOrder: 50,
    parameters: [
      {
        key: "letterSpacingEm",
        displayName: "Letter spacing",
        description: "Letter spacing adjustment in em units.",
        valueKind: "number",
        required: true,
        defaultValue: "0",
        unit: "em",
        minValue: 0,
        maxValue: 0.12,
        step: 0.01,
        options: [],
      },
    ],
  },
  {
    moduleId: "theme-mode",
    displayName: "Theme mode",
    description: "Changes the participant reading theme mode.",
    group: "appearance",
    sortOrder: 60,
    parameters: [
      {
        key: "themeMode",
        displayName: "Theme mode",
        description: "Color mode for the participant reading surface.",
        valueKind: "string",
        required: true,
        defaultValue: "light",
        unit: null,
        minValue: null,
        maxValue: null,
        step: null,
        options: [
          { value: "light", displayName: "Light", description: null },
          { value: "dark", displayName: "Dark", description: null },
        ],
      },
    ],
  },
  {
    moduleId: "palette",
    displayName: "Color palette",
    description: "Changes the participant reading palette.",
    group: "appearance",
    sortOrder: 70,
    parameters: [
      {
        key: "palette",
        displayName: "Color palette",
        description: "Palette applied to the participant reading surface.",
        valueKind: "string",
        required: true,
        defaultValue: "default",
        unit: null,
        minValue: null,
        maxValue: null,
        step: null,
        options: [
          { value: "default", displayName: "Default", description: null },
          { value: "sepia", displayName: "Sepia", description: null },
          { value: "high-contrast", displayName: "High contrast", description: null },
        ],
      },
    ],
  },
]
