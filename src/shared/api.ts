import type { Appearance, ProgressEvent, SettingsSnapshot } from './types'
import type { WidgetMode } from './layout'

/** Contract exposed to the renderer via contextBridge as `window.agentPulse`. */
export interface AgentPulseApi {
  onProgress(cb: (e: ProgressEvent | null) => void): () => void
  onSettingsChanged(cb: (s: SettingsSnapshot) => void): () => void
  getSettings(): Promise<SettingsSnapshot>
  setAppearance(appearance: Appearance): void
  notify(title: string, body: string): void
  isPointerInside(): Promise<boolean>
  setMode(mode: WidgetMode): void
  move(dx: number, dy: number): void
  moveEnd(): void
  openMain(): void
  openAgent(): void
  hideToWidget(): void
}
