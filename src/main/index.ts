import { app, BrowserWindow, ipcMain } from 'electron'
import { MockAgent } from './mockAgent'
import { AgentMonitor } from './agentMonitor'
import type { ProgressEvent } from '../shared/types'
import { registerIpc } from './ipc'
import { loadSettings } from './settings'
import { createTray } from './tray'
import { createWidgetWindow, getMainWindow, getWidget } from './windows'
import { focusAgentTerminal } from './openAgent'

const agent = new MockAgent()

// Keep a single instance so the widget/tray never duplicates.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    getWidget()?.show()
  })

  app.whenReady().then(() => {
    // Feels like a background OS component: no Dock icon on macOS.
    if (process.platform === 'darwin') app.dock?.hide()

    loadSettings()
    registerIpc(agent)

    createWidgetWindow()
    createTray(agent)

    let latest: ProgressEvent | null = null
    ipcMain.handle('agent:get-progress', () => latest)
    ipcMain.on('agent:open', () => focusAgentTerminal(latest?.terminalApp))
    const publish = (e: ProgressEvent): void => {
      const newTask = !latest || e.taskId !== latest.taskId || (e.state === 'running' && !['running', 'waiting'].includes(latest.state))
      latest = e
      if (newTask || e.state === 'completed' || e.state === 'failed' || e.state === 'approval') getWidget()?.showInactive()
      getWidget()?.webContents.send('agent:progress', e)
      getMainWindow()?.webContents.send('agent:progress', e)
    }
    agent.onProgress(publish)
    getWidget()?.webContents.on('did-finish-load', () => {
      if (latest) getWidget()?.webContents.send('agent:progress', latest)
    })
    const monitor = new AgentMonitor(publish)
    void monitor.start()
    app.on('before-quit', () => monitor.stop())

    // Remain hidden until a real task starts; demos are manual only.

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWidgetWindow()
    })
  })
}

// Quit only from the tray (or Cmd+Q); closing windows hides them instead.
app.on('window-all-closed', () => {
  /* keep running via tray */
})
