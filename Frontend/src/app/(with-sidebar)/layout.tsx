import Link from "next/link";
import { BookOpen, Layers, NotebookPen, Settings2, SquareDashedMousePointer, TimerReset } from "lucide-react";

import { FontSelector } from "@/components/theme/font-selector";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { PaletteToggle } from "@/components/theme/palette-toggle";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function WithSidebarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none">
                <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Reading App</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Workspace
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Home">
                    <Link href="/">
                      <Layers />
                      <span>Home</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Reading Material Setup">
                    <Link href="/reading-material/setup">
                      <NotebookPen />
                      <span>Reading Material Setup</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Reading">
                    <Link href="/reading">
                      <BookOpen />
                      <span>Reading</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Researcher Live">
                    <Link href="/researcher/current-live">
                      <SquareDashedMousePointer />
                      <span>Researcher Live</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Replay">
                    <Link href="/replay">
                      <TimerReset />
                      <span>Replay</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="/settings">
                      <Settings2 />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <p className="text-sm font-medium">Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <FontSelector className="w-[150px] sm:w-[180px]" />
            <ModeToggle />
            <PaletteToggle appearance="flat" />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
