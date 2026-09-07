import { useCallback, useEffect, useState } from 'react'
import type { Appearance } from '@shared/types'
import { resolveTheme } from '@shared/theme'
import { applyTheme } from '../lib/theme'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Manages the appearance mode (auto / dark / light) and applies the resolved
 * theme tokens. `auto` inverts the system preference so the widget contrasts
 * against the desktop. Mirrors settings via IPC so every window stays in sync.
 */
export function useTheme(): { appearance: Appearance; setAppearance: (a: Appearance) => void } {
  const [appearance, setAppearanceState] = useState<Appearance>('auto')
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const off = window.agentPulse.onSettingsChanged((s) => setAppearanceState(s.appearance))
    window.agentPulse.getSettings().then((s) => setAppearanceState(s.appearance))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => {
      off()
      mq.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    applyTheme(resolveTheme(appearance, systemDark))
  }, [appearance, systemDark])

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a)
    window.agentPulse.setAppearance(a)
  }, [])

  return { appearance, setAppearance }
}
