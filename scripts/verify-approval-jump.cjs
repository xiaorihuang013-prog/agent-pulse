const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const pause = ms => new Promise(r => setTimeout(r, ms))

// End-to-end check of the approval click → focus-terminal behavior:
// in approval state a click must send `agent:open` (not `widget:open-main`),
// and in any other state it must send `widget:open-main` (not `agent:open`).
app.whenReady().then(async () => {
  try {
    let agentOpen = 0
    let openMain = 0
    ipcMain.on('agent:open', () => { agentOpen++ })
    ipcMain.on('widget:open-main', () => { openMain++ })
    ipcMain.handle('agent:get-progress', () => null)
    ipcMain.handle('settings:get', () => ({ soundEnabled: false, theme: 'monochrome-lime', appearance: 'dark', notifyEnabled: false, language: 'en' }))
    ipcMain.on('widget:mode', () => {})

    const win = new BrowserWindow({ width: 140, height: 140, show: false, frame: false, transparent: true, webPreferences: { preload: path.join(root, 'out/preload/index.js'), autoplayPolicy: 'no-user-gesture-required' } })
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await pause(100)

    const click = () => win.webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector('.widget')
        el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, screenX: 40, screenY: 40, bubbles: true }))
        window.dispatchEvent(new PointerEvent('pointerup', { screenX: 40, screenY: 40 }))
      })()
    `)

    const approval = { taskId: 'ap', noticeId: 'ap:1', source: 'Claude Code', terminalApp: 'vscode', title: 'Run Checks', state: 'approval', progress: 0.5, stage: 'Review', stageIndex: 3, etaSeconds: null, estimated: false, message: 'Approval needed', startedAt: Date.now() }
    win.webContents.send('agent:progress', approval)
    await pause(300)
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.widget').className`), 'widget widget--approval')
    await click()
    await pause(100)
    assert.equal(agentOpen, 1, 'approval click must send agent:open')
    assert.equal(openMain, 0, 'approval click must not open the detail window')

    const running = { ...approval, taskId: 'run', noticeId: 'run:0', state: 'running', terminalApp: undefined }
    win.webContents.send('agent:progress', running)
    await pause(300)
    await click()
    await pause(100)
    assert.equal(agentOpen, 1, 'non-approval click must not send agent:open again')
    assert.equal(openMain, 1, 'non-approval click must open the detail window')

    console.log('approval-jump verified: approval click → agent:open (terminal), otherwise → widget:open-main.')
    app.exit(0)
  } catch (e) { console.error(e); app.exit(1) }
})
