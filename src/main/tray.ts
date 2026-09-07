import { app, Menu, Tray } from 'electron'
import type { MockAgent } from './mockAgent'
import { getSettings, setSoundEnabled } from './settings'
import { getWidget, showMainWindow, toggleWidgetVisibility } from './windows'

import { createTrayIcon } from './trayIcon'

let tray: Tray | null = null

export function createTray(agent: MockAgent): void {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('Agent Pulse')
  rebuildMenu(agent)
}

function rebuildMenu(agent: MockAgent): void {
  if (!tray) return
  const sound = getSettings().soundEnabled

  const menu = Menu.buildFromTemplate([
    { label: 'Show / Hide Widget', click: () => toggleWidgetVisibility() },
    { label: 'Open Main Window', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Run Demo Task', click: () => agent.start() },
    { label: 'Pause', click: () => agent.pause() },
    { label: 'Resume', click: () => agent.resume() },
    { label: 'Cancel', click: () => agent.cancel() },
    { label: 'Simulate Failure', click: () => agent.fail() },
    { type: 'separator' },
    {
      label: 'Sound',
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        setSoundEnabled(item.checked)
        getWidget()?.webContents.send('settings:changed', {
          soundEnabled: item.checked,
          theme: getSettings().theme
        })
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}
