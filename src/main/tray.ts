import { app, Menu, Tray } from 'electron'
import type { MockAgent } from './mockAgent'
import type { Appearance } from '../shared/types'
import type { Lang } from '../shared/i18n'
import { t } from '../shared/i18n'
import {
  getAppearance,
  getLanguage,
  getSettings,
  isNotifyEnabled,
  setAppearance,
  setLanguage,
  setNotifyEnabled,
  setSoundEnabled
} from './settings'
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
  const lang = getLanguage()
  const current = getAppearance()
  const make = (key: 'appearanceAuto' | 'appearanceDark' | 'appearanceLight', value: Appearance): Electron.MenuItemConstructorOptions => ({
    label: t(lang, key),
    type: 'radio',
    checked: current === value,
    click: () => {
      setAppearance(value)
      broadcastSettings()
      rebuildMenu(agent)
    }
  })
  return [make('appearanceAuto', 'auto'), make('appearanceDark', 'dark'), make('appearanceLight', 'light')]
}

function languageItems(agent: MockAgent): Electron.MenuItemConstructorOptions[] {
  const current = getLanguage()
  const make = (label: string, value: Lang): Electron.MenuItemConstructorOptions => ({
    label,
    type: 'radio',
    checked: current === value,
    click: () => {
      setLanguage(value)
      broadcastSettings()
      rebuildMenu(agent)
    }
  })
  return [make('English', 'en'), make('中文', 'zh')]
}

function rebuildMenu(agent: MockAgent): void {
  if (!tray) return
  const lang = getLanguage()
  const sound = getSettings().soundEnabled
  const notify = isNotifyEnabled()

  const menu = Menu.buildFromTemplate([
    { label: t(lang, 'showHideWidget'), click: () => toggleWidgetVisibility() },
    { label: t(lang, 'openMain'), click: () => showMainWindow() },
    { type: 'separator' },
    { label: t(lang, 'runDemo'), click: () => agent.start() },
    { label: t(lang, 'pause'), click: () => agent.pause() },
    { label: t(lang, 'resume'), click: () => agent.resume() },
    { label: t(lang, 'cancel'), click: () => agent.cancel() },
    { label: t(lang, 'simulateFailure'), click: () => agent.fail() },
    { type: 'separator' },
    { label: t(lang, 'appearance'), submenu: appearanceItems(agent) },
    { label: t(lang, 'language'), submenu: languageItems(agent) },
    {
      label: t(lang, 'sound'),
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        setSoundEnabled(item.checked)
        broadcastSettings()
      }
    },
    {
      label: t(lang, 'notifications'),
      type: 'checkbox',
      checked: notify,
      click: (item) => {
        setNotifyEnabled(item.checked)
        broadcastSettings()
      }
    },
    { type: 'separator' },
    { label: t(lang, 'quit'), click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}
