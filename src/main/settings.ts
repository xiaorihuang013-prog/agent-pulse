import { app, screen } from 'electron'
import type { Rectangle } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_THEME } from '../shared/theme'
import type { ThemeId } from '../shared/types'

interface SettingsShape {
  widgetBounds: Rectangle | null
  soundEnabled: boolean
  theme: ThemeId
}

const defaults: SettingsShape = {
  widgetBounds: null,
  soundEnabled: true,
  theme: DEFAULT_THEME
}

let cached: SettingsShape = { ...defaults }
let loaded = false

function filePath(): string {
  return join(app.getPath('userData'), 'agent-pulse.json')
}

export function loadSettings(): SettingsShape {
  if (loaded) return cached
  loaded = true
  try {
    const fp = filePath()
    if (existsSync(fp)) {
      const raw = JSON.parse(readFileSync(fp, 'utf-8')) as Partial<SettingsShape>
      cached = { ...defaults, ...raw }
    }
  } catch (err) {
    console.error('[settings] failed to load', err)
    cached = { ...defaults }
  }
  return cached
}

function persist(): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    writeFileSync(filePath(), JSON.stringify(cached, null, 2), 'utf-8')
  } catch (err) {
    console.error('[settings] failed to save', err)
  }
}

export function getSettings(): SettingsShape {
  return cached
}

export function isSoundEnabled(): boolean {
  return cached.soundEnabled
}

export function setSoundEnabled(v: boolean): void {
  cached.soundEnabled = v
  persist()
}

export function setWidgetBounds(bounds: Rectangle): void {
  cached.widgetBounds = bounds
  persist()
}

function clamp(b: Rectangle, wa: Rectangle, width: number, height: number): Rectangle {
  const x = Math.min(Math.max(b.x, wa.x), wa.x + wa.width - width)
  const y = Math.min(Math.max(b.y, wa.y), wa.y + wa.height - height)
  return { x, y, width, height }
}

/**
 * Resolve a resting position for the widget. Restores the persisted position when
 * its center still lands on a connected display; otherwise falls back to the
 * primary display's top-right. Clamps into the nearest work area (basic multi-monitor).
 */
export function resolveWidgetBounds(width: number, height: number): Rectangle {
  const displays = screen.getAllDisplays()
  const saved = cached.widgetBounds
  if (saved) {
    const cx = saved.x + saved.width / 2
    const cy = saved.y + saved.height / 2
    for (const d of displays) {
      const wa = d.workArea
      if (cx >= wa.x && cx <= wa.x + wa.width && cy >= wa.y && cy <= wa.y + wa.height) {
        return clamp(saved, wa, width, height)
      }
    }
  }
  const wa = screen.getPrimaryDisplay().workArea
  const x = wa.x + wa.width - width - 24
  const y = wa.y + 24
  return { x, y, width, height }
}
