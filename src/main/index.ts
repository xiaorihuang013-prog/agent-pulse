import { app, BrowserWindow } from 'electron'
import { MockAgent } from './mockAgent'
import { registerIpc } from './ipc'
import { loadSettings } from './settings'
import { createTray } from './tray'
import { createWidgetWindow, getMainWindow, getWidget } from './windows'

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

    agent.onProgress((e) => {
      getWidget()?.webContents.send('agent:progress', e)
      getMainWindow()?.webContents.send('agent:progress', e)
    })

    // Auto-start a demo task so the widget is alive immediately.
    agent.start()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWidgetWindow()
    })
  })
}

// Quit only from the tray (or Cmd+Q); closing windows hides them instead.
app.on('window-all-closed', () => {
  /* keep running via tray */
})
