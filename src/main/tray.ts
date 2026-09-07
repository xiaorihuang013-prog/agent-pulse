import { app, Menu, Tray } from 'electron'
import type { MockAgent } from './mockAgent'
import type { Appearance } from '../shared/types'
import { getAppearance, getSettings, setAppearance, setSoundEnabled } from './settings'
import { broadcastSettings } from './ipc'
import { showMainWindow, toggleWidgetVisibility } from './windows'

import { createTrayIcon } from './trayIcon'

let tray: Tray | null = null

export function createTray(agent: MockAgent): void {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('Agent Pulse')
  rebuildMenu(agent)
}

function appearanceItems(agent: MockAgent): Electron.MenuItemConstructorOptions[] {
  const current = getAppearance()
  const make = (label: string, value: Appearance): Electron.MenuItemConstructorOptions => ({
    label,
    type: 'radio',
    checked: current === value,
    click: () => {
      setAppearance(value)
      broadcastSettings()
      rebuildMenu(agent)
    }
  })
  return [make('Auto (invert system)', 'auto'), make('Dark', 'dark'), make('Light', 'light')]
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
    { label: 'Appearance', submenu: appearanceItems(agent) },
    {
      label: 'Sound',
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        setSoundEnabled(item.checked)
        broadcastSettings()
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}
