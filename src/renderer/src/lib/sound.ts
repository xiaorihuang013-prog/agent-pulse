let ctx: AudioContext | null = null
export type AlertTone = 'completed' | 'approval' | 'failed'

export const ALERT_NOTES: Record<AlertTone, readonly number[]> = {
  completed: [659.25, 987.77],
  approval: [783.99, 783.99, 1046.5],
  failed: [392, 293.66, 196]
}

/** Distinct short cues, played once per state transition and respecting Sound. */
export function playAlertSound(tone: AlertTone, enabled: boolean): void {
  if (!enabled) return
  void (async () => {
    try {
      ctx ??= new AudioContext()
      if (ctx.state === 'suspended') await ctx.resume()
      const c = ctx, now = c.currentTime
      ALERT_NOTES[tone].forEach((frequency, i) => {
        const osc = c.createOscillator(), gain = c.createGain()
        osc.type = 'sine'; osc.frequency.value = frequency
        const t = now + i * (tone === 'approval' ? 0.21 : 0.14)
        const length = tone === 'completed' ? 0.6 : 0.23
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.13, t + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
        osc.connect(gain); gain.connect(c.destination)
        osc.start(t); osc.stop(t + length + 0.03)
        osc.onended = () => { osc.disconnect(); gain.disconnect() }
      })
    } catch { /* audio is unavailable */ }
  })()
}
