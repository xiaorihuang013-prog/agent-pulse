import type { Appearance, ThemeId, ThemeTokens } from './types'

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
  success: '#E3FF3F',
  cardBackground: '#000000',
  approval: '#F5BF67'
}

/** Light counterpart — warm cream (米色) instead of cold white, lime darkened for contrast. */
export const monochromeLimeLight: ThemeTokens = {
  id: 'monochrome-lime-light',
  name: 'Monochrome Lime Light',
  background: '#EEE8D4',
  surface: '#FAF5E6',
  primaryText: '#211D13',
  secondaryText: '#6C6555',
  divider: '#D9D2BC',
  accent: '#7A8A00',
  danger: '#E5484D',
  success: '#7A8A00',
  cardBackground: '#F5EFDA',
  approval: '#B07800'
}

// Architecture supports more themes (purple / blue / amber / custom) by adding a
// ThemeTokens object here — the renderer consumes them purely through CSS variables.
export const themes: Partial<Record<ThemeId, ThemeTokens>> = {
  'monochrome-lime': monochromeLime,
  'monochrome-lime-light': monochromeLimeLight
}

export function getTheme(id: ThemeId): ThemeTokens {
  return themes[id] ?? monochromeLime
}

/**
 * Resolve the effective appearance. `auto` inverts the system preference so the
 * floating widget always contrasts against the desktop (dark system → light widget).
 */
export function resolveTheme(appearance: Appearance, systemDark: boolean): ThemeTokens {
  const light = appearance === 'light' || (appearance === 'auto' && systemDark)
  return light ? monochromeLimeLight : monochromeLime
}

export const DEFAULT_THEME: ThemeId = 'monochrome-lime'

export const DEFAULT_APPEARANCE: Appearance = 'auto'
