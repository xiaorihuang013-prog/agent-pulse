import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

/** A task preview has a fixed lifetime; native resize events must not latch hover. */
export function useWidgetExpansion(active: boolean, taskKey: string | null) {
  const [hovered, setHovered] = useState(false)
  const [preview, setPreview] = useState(false)
  const previewRef = useRef(false)
  const lastTask = useRef<string | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearHover = () => {
    clearTimeout(hoverTimer.current)
    clearTimeout(leaveTimer.current)
    hoverTimer.current = undefined
    leaveTimer.current = undefined
    setHovered(false)
  }

  useEffect(() => {
    if (!active) {
      clearTimeout(previewTimer.current)
      previewRef.current = false
      setPreview(false)
      clearHover()
      return
    }
    // Approval/resume and repeated progress events are still the same task.
    if (!taskKey || lastTask.current === taskKey) return
    lastTask.current = taskKey
    clearHover()
    clearTimeout(previewTimer.current)
    previewRef.current = true
    setPreview(true)
    previewTimer.current = setTimeout(() => {
      previewRef.current = false
      setPreview(false)
      clearHover()
    }, 3000)
  }, [active, taskKey])

  useEffect(() => {
    if (!hovered) return
    let disposed = false
    let pending = false
    // macOS frameless window resizing can omit mouseleave. Check the native
    // cursor only while hovered, without relying on the renderer's stale hit test.
    const timer = setInterval(async () => {
      if (pending) return
      pending = true
      try {
        const inside = await window.agentPulse.isPointerInside()
        if (!disposed && !inside) clearHover()
      } catch { /* the window may be closing */ }
      finally { pending = false }
    }, 200)
    return () => { disposed = true; clearInterval(timer) }
  }, [hovered])

  useEffect(() => {
    const reset = () => clearHover()
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    return () => {
      clearTimeout(previewTimer.current)
      clearTimeout(hoverTimer.current)
      clearTimeout(leaveTimer.current)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
    }
  }, [])

  const onMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    if (!active || event.buttons !== 0 || previewRef.current) return
    clearTimeout(leaveTimer.current)
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHovered(true), 140)
  }
  const onMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => setHovered(false), 120)
  }

  return { expanded: preview || hovered, onMouseEnter, onMouseLeave }
}
