import { useEffect, useRef } from 'react'

/**
 * 1.5px hairline progress bar. Animates the fill via a direct `scaleX` transform
 * on a ref — zero React re-renders during the tween, GPU-composited.
 */
export function HairlineProgress({ target }: { target: number }) {
  const barRef = useRef<HTMLDivElement>(null)
  const current = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = (): void => {
      const diff = target - current.current
      current.current += diff * 0.14
      if (Math.abs(diff) < 0.0005) current.current = target
      if (barRef.current) barRef.current.style.transform = `scaleX(${current.current})`
      if (Math.abs(target - current.current) > 0.0005) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div className="hairline">
      <div className="hairline__fill" ref={barRef} />
    </div>
  )
}
