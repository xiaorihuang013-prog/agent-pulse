import type { ThemeId, ThemeTokens } from './types'

/** First-ship theme — Acid Yellow / Lime on near-black. */
export const monochromeLime: ThemeTokens = {
  id: 'monochrome-lime',
  name: 'Monochrome Lime',
  background: '#0B0B0D',
  surface: '#151519',
  primaryText: '#F5F5F5',
  secondaryText: '#8D8D94',
  divider: '#2A2A2F',
  accent: '#E3FF3F',
  danger: '#FF5C5C',
  success: '#E3FF3F'
}

// Architecture supports more themes (purple / blue / amber / custom) by adding a
// ThemeTokens object here — the renderer consumes them purely through CSS variables.
export const themes: Partial<Record<ThemeId, ThemeTokens>> = {
  'monochrome-lime': monochromeLime
}

export function getTheme(id: ThemeId): ThemeTokens {
  return themes[id] ?? monochromeLime
}

export const DEFAULT_THEME: ThemeId = 'monochrome-lime'
