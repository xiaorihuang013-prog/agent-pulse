import type { ThemeTokens } from '@shared/types'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Push theme tokens into CSS custom properties so the whole UI is theme-driven. */
export function applyTheme(t: ThemeTokens): void {
  const root = document.documentElement
  const set = (k: string, v: string): void => root.style.setProperty(k, v)
  set('--background', t.background)
  set('--surface', t.surface)
  set('--primary', t.primaryText)
  set('--secondary', t.secondaryText)
  set('--divider', t.divider)
  set('--accent', t.accent)
  set('--danger', t.danger)
  set('--success', t.success)
  set('--accent-glow', rgba(t.accent, 0.4))
  set('--accent-soft', rgba(t.accent, 0.13))
  set('--danger-soft', rgba(t.danger, 0.16))
  set('--primary-dim', rgba(t.primaryText, 0.07))
}
