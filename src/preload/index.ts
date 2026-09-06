import { contextBridge, ipcRenderer } from 'electron'
import type { ProgressEvent, SettingsSnapshot } from '../shared/types'
import type { WidgetMode } from '../shared/layout'
import type { AgentPulseApi } from '../shared/api'

const api: AgentPulseApi = {
  onProgress(cb) {
    const listener = (_e: Electron.IpcRendererEvent, event: ProgressEvent): void => cb(event)
    ipcRenderer.on('agent:progress', listener)
    return () => ipcRenderer.removeListener('agent:progress', listener)
  },
  onSettingsChanged(cb) {
    const listener = (_e: Electron.IpcRendererEvent, s: SettingsSnapshot): void => cb(s)
    ipcRenderer.on('settings:changed', listener)
    return () => ipcRenderer.removeListener('settings:changed', listener)
  },
  getSettings() {
    return ipcRenderer.invoke('settings:get')
  },
  setMode(mode: WidgetMode) {
    ipcRenderer.send('widget:mode', mode)
  },
  move(dx, dy) {
    ipcRenderer.send('widget:move', dx, dy)
  },
  moveEnd() {
    ipcRenderer.send('widget:move-end')
  },
  openMain() {
    ipcRenderer.send('widget:open-main')
  },
  hideToWidget() {
    ipcRenderer.send('main:hide-to-widget')
  }
}

contextBridge.exposeInMainWorld('agentPulse', api)
