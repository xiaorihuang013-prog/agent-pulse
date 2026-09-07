import { useEffect, useState } from 'react'
import type { Appearance, ProgressEvent } from '@shared/types'

const OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' }
]

/** Current task details; the widget hides while this window is open. */
export function MainView({
  appearance,
  setAppearance
}: {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}) {
  const [event, setEvent] = useState<ProgressEvent | null>(null)

  useEffect(() => window.agentPulse.onProgress(setEvent), [])

  return (
    <div className="mainview">
      <h1>Agent Pulse</h1>
      <div className="m-title">{event?.title ?? '—'}</div>
      <div className="m-pct">{Math.round((event?.progress ?? 0) * 100)}%</div>
      <div className="m-state">
        {event ? `${event.state} · ${event.taskTitle ?? 'Agent Task'}` : 'Idle'}
      </div>
      <div className="m-appearance" role="group" aria-label="Appearance">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`m-appearance__btn${appearance === o.value ? ' is-active' : ''}`}
            aria-pressed={appearance === o.value}
            onClick={() => setAppearance(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" className="m-hide" onClick={() => window.agentPulse.hideToWidget()}>
        Hide to Widget
      </button>
    </div>
  )
}
