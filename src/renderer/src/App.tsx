import { useEffect, useState } from 'react'
import type { Appearance, ProgressEvent } from '@shared/types'
import { MainView } from './components/MainView'
import { Widget } from './components/Widget'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const isMain = window.location.hash === '#main'
  const { appearance, setAppearance } = useTheme()

  if (isMain) return <MainView appearance={appearance} setAppearance={setAppearance} />
  return <WidgetRoot appearance={appearance} setAppearance={setAppearance} />
}

function WidgetRoot({
  appearance,
  setAppearance
}: {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}) {
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

  return <Widget event={event} soundEnabled={soundEnabled} appearance={appearance} setAppearance={setAppearance} />
}
