import type { ReaderShellViewSettings } from "@/lib/reader-shell-settings"

export const PLAYBACK_SPEEDS = [0.5, 1, 2] as const

export type ReplayPlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export type ReplayReaderOptions = ReaderShellViewSettings
