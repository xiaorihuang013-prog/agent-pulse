import { useEffect, useState } from 'react'
import type { ProgressEvent } from '@shared/types'

/** Current task details; the widget hides while this window is open. */
export function MainView() {
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
      <button type="button" onClick={() => window.agentPulse.hideToWidget()}>
        Hide to Widget
      </button>
    </div>
  )
}
