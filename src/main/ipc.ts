import { ipcMain, Notification, screen } from 'electron'
import type { WidgetMode } from '../shared/layout'
import type { Appearance } from '../shared/types'
import {
  getAppearance,
  getLanguage,
  getSettings,
  isNotifyEnabled,
  isSoundEnabled,
  setAppearance,
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

export function registerIpc(): void {
  ipcMain.handle('widget:pointer-inside', () => {
    const widget = getWidget()
    if (!widget || widget.isDestroyed() || !widget.isVisible()) return false
    const { x, y } = screen.getCursorScreenPoint()
    const bounds = widget.getBounds()
    return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height
  })
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


  ipcMain.on('settings:set-appearance', (_e, v: Appearance) => {
    setAppearance(v)
    broadcastSettings()
  })



  // Desktop notification (from the widget on completion / failure / approval).
  ipcMain.on('app:notify', (_e, title: string, body: string) => {
    if (!Notification.isSupported()) return
    const n = new Notification({ title, body })
    n.on('click', () => showMainWindow())
    n.show()
  })
}
