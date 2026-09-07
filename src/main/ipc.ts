import { ipcMain, Notification } from 'electron'
import type { MockAgent } from './mockAgent'
import type { WidgetMode } from '../shared/layout'
import type { Appearance } from '../shared/types'
import type { Lang } from '../shared/i18n'
import {
  getAppearance,
  getLanguage,
  getSettings,
  isNotifyEnabled,
  isSoundEnabled,
  setAppearance,
  setLanguage,
  setNotifyEnabled,
  setSoundEnabled
} from './settings'
import {
  commitWidgetPosition,
  getMainWindow,
  getWidget,
  hideMainWindow,
  moveWidgetBy,
  setWidgetMode,
  showMainWindow
} from './windows'

export function broadcastSettings(): void {
  const snapshot = {
    soundEnabled: isSoundEnabled(),
    theme: getSettings().theme,
    appearance: getAppearance(),
    notifyEnabled: isNotifyEnabled(),
    language: getLanguage()
  }
  getWidget()?.webContents.send('settings:changed', snapshot)
  getMainWindow()?.webContents.send('settings:changed', snapshot)
}

export function registerIpc(agent: MockAgent): void {
  ipcMain.on('widget:mode', (_e, mode: WidgetMode) => setWidgetMode(mode))
  ipcMain.on('widget:move', (_e, dx: number, dy: number) => moveWidgetBy(dx, dy))
  ipcMain.on('widget:move-end', () => commitWidgetPosition())
  ipcMain.on('widget:open-main', () => showMainWindow())
  ipcMain.on('main:hide-to-widget', () => hideMainWindow())

  ipcMain.handle('settings:get', () => ({
    soundEnabled: isSoundEnabled(),
    theme: getSettings().theme,
    appearance: getAppearance(),
    notifyEnabled: isNotifyEnabled(),
    language: getLanguage()
  }))

  ipcMain.on('settings:set-sound', (_e, v: boolean) => {
    setSoundEnabled(v)
    broadcastSettings()
  })

  ipcMain.on('settings:set-appearance', (_e, v: Appearance) => {
    setAppearance(v)
    broadcastSettings()
  })

  ipcMain.on('settings:set-notify', (_e, v: boolean) => {
    setNotifyEnabled(v)
    broadcastSettings()
  })

  ipcMain.on('settings:set-language', (_e, v: Lang) => {
    setLanguage(v)
    broadcastSettings()
  })

  // Desktop notification (from the widget on completion / failure / approval).
  ipcMain.on('app:notify', (_e, title: string, body: string) => {
    if (!Notification.isSupported()) return
    const n = new Notification({ title, body })
    n.on('click', () => showMainWindow())
    n.show()
  })

  // Optional renderer-side control; the tray drives the agent primarily.
  ipcMain.on('agent:control', (_e, action: string) => {
    switch (action) {
      case 'start':
        agent.start()
        break
      case 'pause':
        agent.pause()
        break
      case 'resume':
        agent.resume()
        break
      case 'cancel':
        agent.cancel()
        break
      case 'fail':
        agent.fail()
        break
    }
  })
}
