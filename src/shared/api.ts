import type { ProgressEvent, SettingsSnapshot } from './types'
import type { WidgetMode } from './layout'

/** Contract exposed to the renderer via contextBridge as `window.agentPulse`. */
export interface AgentPulseApi {
  onProgress(cb: (e: ProgressEvent) => void): () => void
  onSettingsChanged(cb: (s: SettingsSnapshot) => void): () => void
  getSettings(): Promise<SettingsSnapshot>
  setMode(mode: WidgetMode): void
  move(dx: number, dy: number): void
  moveEnd(): void
  openMain(): void
  hideToWidget(): void
}
