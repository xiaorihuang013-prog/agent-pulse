// Shared types between the Electron main and renderer processes.

export type TaskState =
  | 'queued'
  | 'running'
  | 'paused'
  | 'waiting'
  | 'approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface Stage {
  key: string
  label: string
  /** Fraction of the whole task this stage represents (sums to 1). */
  weight: number
}

/** A single progress snapshot pushed from the mock agent (main) to the renderer. */
export interface ProgressEvent {
  taskId?: string
  noticeId?: string
  taskTitle?: string
  estimated?: boolean
  title: string
  state: TaskState
  /** 0..1 */
  progress: number
  stage: string
  stageIndex: number
  etaSeconds: number | null
  message: string
  error?: string
  /** Task start timestamp (epoch ms) used to derive elapsed time. */
  startedAt?: number
}

export type ThemeId = 'monochrome-lime' | 'monochrome-lime-light' | 'purple' | 'blue' | 'amber' | 'custom'

export type Appearance = 'dark' | 'light' | 'auto'

export interface ThemeTokens {
  id: ThemeId
  name: string
  background: string
  surface: string
  primaryText: string
  secondaryText: string
  divider: string
  accent: string
  danger: string
  success: string
  /** The card's own fill (pure black in dark mode, white in light mode). */
  cardBackground: string
  /** Solid attention/approval accent (amber). */
  approval: string
}

export interface SettingsSnapshot {
  soundEnabled: boolean
  theme: ThemeId
  appearance: Appearance
}
