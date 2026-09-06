import { useEffect, useRef, useState } from 'react'

/**
 * Eases a displayed value toward `target` (0..1) via requestAnimationFrame and
 * returns the eased integer percentage (0..100). setState only fires when the
 * rounded integer changes, so this re-renders at most ~100 times per task.
 */
export function useAnimatedInteger(target: number): number {
  const [value, setValue] = useState(0)
  const displayed = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = (): void => {
      const diff = target - displayed.current
      displayed.current += diff * 0.12
      if (Math.abs(diff) < 0.004) displayed.current = target
      const int = Math.round(displayed.current * 100)
      setValue((prev) => (prev === int ? prev : int))
      if (Math.abs(target - displayed.current) > 0.004) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return value
}
