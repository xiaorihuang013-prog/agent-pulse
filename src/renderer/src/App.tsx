import { useEffect, useState } from 'react'
import type { Appearance, ProgressEvent } from '@shared/types'
import type { Lang } from '@shared/i18n'
import { MainView } from './components/MainView'
import { Widget } from './components/Widget'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'

export default function App() {
  const isMain = window.location.hash === '#main'
  const { appearance, setAppearance } = useTheme()
  const lang = useLanguage()

  if (isMain) return <MainView appearance={appearance} setAppearance={setAppearance} lang={lang} />
  return <WidgetRoot appearance={appearance} setAppearance={setAppearance} lang={lang} />
}

function WidgetRoot({
  appearance,
  setAppearance,
  lang
}: {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
  lang: Lang
}) {
  const [event, setEvent] = useState<ProgressEvent | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notifyEnabled, setNotifyEnabled] = useState(true)

  useEffect(() => {
    const offProgress = window.agentPulse.onProgress(setEvent)
    const offSettings = window.agentPulse.onSettingsChanged((s) => {
      setSoundEnabled(s.soundEnabled)
      setNotifyEnabled(s.notifyEnabled)
    })
    window.agentPulse.getSettings().then((s) => {
      setSoundEnabled(s.soundEnabled)
      setNotifyEnabled(s.notifyEnabled)
    })
    return () => {
      offProgress()
      offSettings()
    }
  }, [])

  return (
    <Widget
      event={event}
      soundEnabled={soundEnabled}
      notifyEnabled={notifyEnabled}
      lang={lang}
      appearance={appearance}
      setAppearance={setAppearance}
    />
  )
}
