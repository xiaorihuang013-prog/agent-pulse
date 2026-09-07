import { ipcMain } from 'electron'
import type { MockAgent } from './mockAgent'
import type { WidgetMode } from '../shared/layout'
import type { Appearance } from '../shared/types'
import {
  getAppearance,
  getSettings,
  isSoundEnabled,
  setAppearance,
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
    appearance: getAppearance()
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
    appearance: getAppearance()
  }))

  ipcMain.on('settings:set-sound', (_e, v: boolean) => {
    setSoundEnabled(v)
    broadcastSettings()
  })

  ipcMain.on('settings:set-appearance', (_e, v: Appearance) => {
    setAppearance(v)
    broadcastSettings()
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
