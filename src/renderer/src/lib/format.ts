import type { ProgressEvent } from '@shared/types'
import type { Lang } from '@shared/i18n'
import { t } from '@shared/i18n'

/** Format an elapsed duration in ms as monospace-friendly `mm:ss` (or `h:mm:ss`). */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Remaining-time label: a humanized ETA, or a state word when the task isn't advancing. */
export function formatEta(event: ProgressEvent | null, lang: Lang): string {
  if (!event) return '—'
  if (event.state === 'paused') return t(lang, 'paused')
  if (event.state === 'queued') return t(lang, 'queued')
  if (event.state === 'cancelled') return t(lang, 'stopped')
  if (event.etaSeconds == null) return '—'
  const s = event.etaSeconds
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
