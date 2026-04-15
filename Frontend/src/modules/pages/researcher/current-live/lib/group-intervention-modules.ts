import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"

export type LiveInterventionModuleGroup = {
  key: string
  title: string
  modules: InterventionModuleDescriptor[]
}

const SECTION_DEFINITIONS: ReadonlyArray<{
  key: string
  title: string
  moduleIds: readonly string[]
}> = [
  {
    key: "presentation",
    title: "Presentation",
    moduleIds: [
      "font-family",
      "participant-edit-lock",
      "font-size",
      "line-width",
      "line-height",
      "letter-spacing",
    ],
  },
  {
    key: "appearance",
    title: "Appearance",
    moduleIds: ["theme-mode", "palette"],
  },
]

function toTitleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

export function groupInterventionModules(
  modules: InterventionModuleDescriptor[]
): LiveInterventionModuleGroup[] {
  const byId = new Map(modules.map((descriptor) => [descriptor.moduleId, descriptor] as const))
  const assigned = new Set<string>()

  const groups = SECTION_DEFINITIONS.map((section) => {
    const sectionModules = section.moduleIds
      .map((moduleId) => byId.get(moduleId))
      .filter((descriptor): descriptor is InterventionModuleDescriptor => Boolean(descriptor))

    for (const descriptor of sectionModules) {
      assigned.add(descriptor.moduleId)
    }

    return {
      key: section.key,
      title: section.title,
      modules: sectionModules,
    }
  }).filter((group) => group.modules.length > 0)

  const remainingModules = modules
    .filter((descriptor) => !assigned.has(descriptor.moduleId))
    .sort((left, right) => left.sortOrder - right.sortOrder)

  if (remainingModules.length > 0) {
    const extrasByGroup = new Map<string, InterventionModuleDescriptor[]>()

    for (const descriptor of remainingModules) {
      const bucket = extrasByGroup.get(descriptor.group) ?? []
      bucket.push(descriptor)
      extrasByGroup.set(descriptor.group, bucket)
    }

    for (const [key, groupModules] of extrasByGroup) {
      groups.push({
        key,
        title: toTitleCase(key),
        modules: groupModules,
      })
    }
  }

  return groups
}
