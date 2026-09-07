import { useEffect, useState } from 'react'

/**
 * Seconds-resolution elapsed time since `startedAt`. Ticks once per second only
 * while `active` (the task is running / waiting / paused); returns `null` when no
 * start timestamp is known. Shared by the widget and the detail window.
 */
export function useElapsedTime(startedAt: number | undefined, active: boolean): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt == null) return
    setNow(Date.now())
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt, active])

  return startedAt != null ? now - startedAt : null
}
