import { useEffect, useState } from 'react'
import { DEFAULT_THEME, getTheme } from '@shared/theme'
import type { ProgressEvent } from '@shared/types'
import { MainView } from './components/MainView'
import { Widget } from './components/Widget'
import { applyTheme } from './lib/theme'

export default function App() {
  const isMain = window.location.hash === '#main'

  useEffect(() => {
    applyTheme(getTheme(DEFAULT_THEME))
  }, [])

  if (isMain) return <MainView />
  return <WidgetRoot />
}

function WidgetRoot() {
  const [event, setEvent] = useState<ProgressEvent | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    const offProgress = window.agentPulse.onProgress(setEvent)
    const offSettings = window.agentPulse.onSettingsChanged((s) => setSoundEnabled(s.soundEnabled))
    window.agentPulse.getSettings().then((s) => setSoundEnabled(s.soundEnabled))
    return () => {
      offProgress()
      offSettings()
    }
  }, [])

  return <Widget event={event} soundEnabled={soundEnabled} />
}
