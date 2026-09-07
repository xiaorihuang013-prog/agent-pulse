import { contextBridge, ipcRenderer } from 'electron'
import type { Appearance, ProgressEvent, SettingsSnapshot } from '../shared/types'
import type { WidgetMode } from '../shared/layout'
import type { AgentPulseApi } from '../shared/api'

const api: AgentPulseApi = {
  onProgress(cb) {
    let receivedLive = false
    let disposed = false
    const listener = (_e: Electron.IpcRendererEvent, event: ProgressEvent): void => {
      receivedLive = true
      cb(event)
    }
    ipcRenderer.on('agent:progress', listener)
    void ipcRenderer.invoke('agent:get-progress').then((event: ProgressEvent | null) => {
      if (event && !receivedLive && !disposed) cb(event)
    }).catch(() => { /* renderer may be closing */ })
    return () => {
      disposed = true
      ipcRenderer.removeListener('agent:progress', listener)
    }
  },
  onSettingsChanged(cb) {
    const listener = (_e: Electron.IpcRendererEvent, s: SettingsSnapshot): void => cb(s)
    ipcRenderer.on('settings:changed', listener)
    return () => ipcRenderer.removeListener('settings:changed', listener)
  },
  getSettings() {
    return ipcRenderer.invoke('settings:get')
  },
  setAppearance(appearance: Appearance) {
    ipcRenderer.send('settings:set-appearance', appearance)
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
