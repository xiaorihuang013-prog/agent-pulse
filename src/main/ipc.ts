import { ipcMain } from 'electron'
import type { MockAgent } from './mockAgent'
import type { WidgetMode } from '../shared/layout'
import { getSettings, isSoundEnabled, setSoundEnabled } from './settings'
import {
  commitWidgetPosition,
  getWidget,
  hideMainWindow,
  moveWidgetBy,
  setWidgetMode,
  showMainWindow
} from './windows'

export function registerIpc(agent: MockAgent): void {
  ipcMain.on('widget:mode', (_e, mode: WidgetMode) => setWidgetMode(mode))
  ipcMain.on('widget:move', (_e, dx: number, dy: number) => moveWidgetBy(dx, dy))
  ipcMain.on('widget:move-end', () => commitWidgetPosition())
  ipcMain.on('widget:open-main', () => showMainWindow())
  ipcMain.on('main:hide-to-widget', () => hideMainWindow())

  ipcMain.handle('settings:get', () => ({
    soundEnabled: isSoundEnabled(),
    theme: getSettings().theme
  }))

  ipcMain.on('settings:set-sound', (_e, v: boolean) => {
    setSoundEnabled(v)
    getWidget()?.webContents.send('settings:changed', {
      soundEnabled: v,
      theme: getSettings().theme
    })
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
