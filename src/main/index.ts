import { app, BrowserWindow, ipcMain } from 'electron'
import { MockAgent } from './mockAgent'
import { AgentMonitor } from './agentMonitor'
import type { ProgressEvent } from '../shared/types'
import { registerIpc } from './ipc'
import { loadSettings } from './settings'
import { createTray } from './tray'
import { createWidgetWindow, getMainWindow, getWidget, hideWidget } from './windows'
import { focusAgentTerminal, logOpenAgent } from './openAgent'

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
    registerIpc()

    createWidgetWindow()
    createTray(agent)

    let latest: ProgressEvent | null = null
    ipcMain.handle('agent:get-progress', () => latest)
    ipcMain.on('agent:open', () => {
      logOpenAgent(`agent:open latest.terminalApp=${latest?.terminalApp ?? '<none>'}`)
      focusAgentTerminal(latest?.terminalApp, latest?.source)
    })
    const publish = (e: ProgressEvent | null): void => {
      if (!e) {
        latest = null
        getWidget()?.webContents.send('agent:progress', null)
        getMainWindow()?.webContents.send('agent:progress', null)
        // No task running: hide the widget (it reappears on the next task).
        hideWidget()
        return
      }
      const newTask = !latest || e.taskId !== latest.taskId || (e.state === 'running' && !['running', 'waiting'].includes(latest.state))
      latest = e
      if (newTask || e.state === 'completed' || e.state === 'failed' || e.state === 'approval') getWidget()?.showInactive()
      getWidget()?.webContents.send('agent:progress', e)
      getMainWindow()?.webContents.send('agent:progress', e)
    }
    const monitor = new AgentMonitor(publish)
    agent.onProgress((e) => {
      publish(e)
      // The demo is a manual test: once it ends, hand control back to the real
      // monitor so its authoritative snapshot (idle or a live task) replaces it.
      if (e.state === 'completed' || e.state === 'failed' || e.state === 'cancelled') {
        setTimeout(() => monitor.refresh(), 0)
      }
    })
    getWidget()?.webContents.on('did-finish-load', () => {
      if (latest) getWidget()?.webContents.send('agent:progress', latest)
    })
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
