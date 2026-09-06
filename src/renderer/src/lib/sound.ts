let ctx: AudioContext | null = null

/** Synthesized two-note completion chime — no audio asset required. */
export function playCompletionSound(enabled: boolean): void {
  if (!enabled) return
  try {
    ctx ??= new AudioContext()
    const c = ctx
    if (c.state === 'suspended') void c.resume()
    const now = c.currentTime
    const notes = [659.25, 987.77] // E5 → B5, short and bright
    notes.forEach((f, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.65)
    })
  } catch {
    /* audio unavailable — ignore */
  }
}
