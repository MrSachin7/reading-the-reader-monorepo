"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SETTINGS_SECTIONS,
  normalizeSettingsTab,
} from "@/modules/pages/settings/lib/settings-tabs"
import { CalibrationSettingsSection } from "@/modules/pages/settings/sections/CalibrationSettingsSection"
import { ReaderShellSettingsSection } from "@/modules/pages/settings/sections/ReaderShellSettingsSection"

function SettingsSectionNav() {
  return (
    <Card className="h-fit shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings2 className="h-5 w-5 text-foreground" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TabsList
          variant="line"
          className="w-full items-stretch justify-start bg-transparent p-0"
          aria-label="Settings sections"
        >
          {SETTINGS_SECTIONS.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="w-full justify-start rounded-xl border bg-background px-4 py-3 text-left transition-colors data-[state=active]:border-border data-[state=active]:bg-accent data-[state=active]:text-foreground"
            >
              <div className="grid min-w-0 gap-1">
                <span className="font-medium">{section.label}</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {section.description}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = normalizeSettingsTab(searchParams.get("currentTab"))

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      const normalizedTab = normalizeSettingsTab(nextTab)
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("currentTab", normalizedTab)
      router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      orientation="vertical"
      className="gap-6 xl:grid xl:grid-cols-[280px_minmax(0,1fr)]"
    >
      <SettingsSectionNav />

      <TabsContent value="calibration">
        <CalibrationSettingsSection />
      </TabsContent>

      <TabsContent value="readershell">
        <ReaderShellSettingsSection />
      </TabsContent>
    </Tabs>
  )
}
