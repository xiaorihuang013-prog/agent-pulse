import { useCallback, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface DragState {
  lastX: number
  lastY: number
  moved: boolean
  raf: number
  pendingDx: number
  pendingDy: number
}

/**
 * Manual frameless drag that also distinguishes a click from a drag: movement
 * beyond a small threshold moves the window (via IPC), otherwise it's a click.
 * Move deltas are coalesced to one IPC call per animation frame.
 */
export function useDrag(onClick: () => void): { onPointerDown: (e: ReactPointerEvent) => void } {
  const stateRef = useRef<DragState | null>(null)

  const flush = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    if (s.pendingDx !== 0 || s.pendingDy !== 0) {
      window.agentPulse.move(s.pendingDx, s.pendingDy)
      s.pendingDx = 0
      s.pendingDy = 0
    }
    s.raf = 0
  }, [])

  const onMove = useCallback(
    (e: PointerEvent) => {
      const s = stateRef.current
      if (!s) return
      const dx = e.screenX - s.lastX
      const dy = e.screenY - s.lastY
      s.lastX = e.screenX
      s.lastY = e.screenY
      if (Math.abs(dx) + Math.abs(dy) > 2) s.moved = true
      s.pendingDx += dx
      s.pendingDy += dy
      if (!s.raf) s.raf = requestAnimationFrame(flush)
    },
    [flush]
  )

  const onUp = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (s.raf) cancelAnimationFrame(s.raf)
    stateRef.current = null
    flush()
    window.agentPulse.moveEnd()
    if (!s.moved) onClick()
  }, [onMove, flush, onClick])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      stateRef.current = {
        lastX: e.screenX,
        lastY: e.screenY,
        moved: false,
        raf: 0,
        pendingDx: 0,
        pendingDy: 0
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [onMove, onUp]
  )

  return { onPointerDown }
}
