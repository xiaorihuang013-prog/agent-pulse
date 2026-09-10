import { useEffect, useState } from 'react'
import type { Appearance, ProgressEvent } from '@shared/types'
import type { Lang } from '@shared/i18n'
import { t, stateLabel } from '@shared/i18n'
import { localizeProgress } from '@shared/progressText'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { formatElapsed, formatEta } from '../lib/format'
import { HairlineProgress } from './HairlineProgress'

const OPTIONS: { value: Appearance; label: 'appearanceAuto' | 'appearanceDark' | 'appearanceLight' }[] = [
  { value: 'auto', label: 'appearanceAuto' },
  { value: 'dark', label: 'appearanceDark' },
  { value: 'light', label: 'appearanceLight' }
]

/** Current task details; the widget hides while this window is open. */
export function MainView({
  appearance,
  setAppearance,
  lang
}: {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
  lang: Lang
}) {
  const [rawEvent, setEvent] = useState<ProgressEvent | null>(null)

  useEffect(() => window.agentPulse.onProgress(setEvent), [])

  const event = localizeProgress(rawEvent, lang)
  const state = event?.state ?? 'queued'
  const active = state === 'running' || state === 'waiting' || state === 'paused'
  const elapsedMs = useElapsedTime(event?.startedAt, active)
  const elapsed = elapsedMs != null ? formatElapsed(elapsedMs) : '--:--'
  const pct = Math.round((event?.progress ?? 0) * 100)

  return (
    <div className="mainview">
      <h1>Agent Pulse</h1>
      <div className="m-title">{event?.title ?? '—'}</div>
      <div className="m-progress">
        <HairlineProgress target={event?.progress ?? 0} />
      </div>
      <div className="m-metrics">
        <div className="m-metric">
          <div className="m-metric__value">{event?.estimated ? t(lang, 'estimated') : ''}{pct}%</div>
          <div className="m-metric__label">{t(lang, 'metricPercent')}</div>
        </div>
        <div className="m-metric">
          <div className="m-metric__value">{elapsed}</div>
          <div className="m-metric__label">{t(lang, 'metricElapsed')}</div>
        </div>
        <div className="m-metric">
          <div className="m-metric__value">{formatEta(event, lang)}</div>
          <div className="m-metric__label">{t(lang, 'metricEta')}</div>
        </div>
      </div>
      <div className="m-stage">{event?.estimated ? t(lang, 'estimated') : ''}{event?.stage ?? '—'}</div>
      <div className="m-activity">{event?.activity ?? event?.message ?? ''}</div>
      <div className="m-state">
        {event
          ? `${stateLabel(lang, event.state)}${event.source ? ` · ${event.source}` : ''}`
          : t(lang, 'idle')}
      </div>
      <div className="m-appearance" role="group" aria-label={t(lang, 'appearance')}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`m-appearance__btn${appearance === o.value ? ' is-active' : ''}`}
            aria-pressed={appearance === o.value}
            onClick={() => setAppearance(o.value)}
          >
            {t(lang, o.label)}
          </button>
        ))}
      </div>
      <button type="button" className="m-hide" onClick={() => window.agentPulse.hideToWidget()}>
        {t(lang, 'hideToWidget')}
      </button>
    </div>
  )
}
