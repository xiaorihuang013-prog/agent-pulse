// Shared types between the Electron main and renderer processes.

export type TaskState =
  | 'queued'
  | 'running'
  | 'paused'
  | 'waiting'
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
  title: string
  state: TaskState
  /** 0..1 */
  progress: number
  stage: string
  stageIndex: number
  etaSeconds: number | null
  message: string
  error?: string
}

export type ThemeId = 'monochrome-lime' | 'purple' | 'blue' | 'amber' | 'custom'

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
}

export interface SettingsSnapshot {
  soundEnabled: boolean
  theme: ThemeId
}
