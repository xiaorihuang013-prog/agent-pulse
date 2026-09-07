import { useEffect, useState } from 'react'
import type { Lang } from '@shared/i18n'
import { DEFAULT_LANG } from '@shared/i18n'

/** Current UI language from settings (default English), kept in sync via IPC. */
export function useLanguage(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const off = window.agentPulse.onSettingsChanged((s) => setLang(s.language ?? DEFAULT_LANG))
    window.agentPulse.getSettings().then((s) => setLang(s.language ?? DEFAULT_LANG))
    return () => off()
  }, [])

  return lang
}
