const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const assert = require('node:assert/strict')
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
app.whenReady().then(async () => {
  try {
    let inside = true
    let opens = 0
    let details = 0
    ipcMain.on('agent:open', () => opens++)
    ipcMain.on('widget:open-main', () => details++)
    const root = path.resolve(__dirname, '..')
    const win = new BrowserWindow({ width: 200, height: 200, show: false, webPreferences: {
      preload: path.join(root, 'out/preload/index.js'), backgroundThrottling: false
    } })
    ipcMain.handle('agent:get-progress', () => null)
    ipcMain.handle('widget:pointer-inside', () => inside)
    ipcMain.handle('settings:get', () => ({soundEnabled:false,notifyEnabled:false,appearance:'dark',language:'en'}))
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await pause(100)
    const mode = () => win.webContents.executeJavaScript(`document.querySelector('.widget').className`)
    const enter = () => win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new MouseEvent('mouseover', {bubbles:true}))`)
    const leave = () => win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new MouseEvent('mouseout', {bubbles:true,relatedTarget:document.body}))`)
    const task = {taskId:'codex-a',source:'Codex',title:'Check',state:'running',startedAt:Date.now(),progress:.2,stage:'Working',stageIndex:2,etaSeconds:null,message:''}
    const send = async patch => { win.webContents.send('agent:progress', {...task,...patch}); await pause(80) }
    await send({})
    assert.equal(await mode(), 'widget widget--expanded')
    await enter() // synthetic enter from a window that expands underneath the cursor
    await send({progress:.3})
    await pause(3100)
    assert.equal(await mode(), 'widget widget--compact', 'preview must expire even after mouseenter')
    await enter(); await pause(180)
    assert.equal(await mode(), 'widget widget--expanded')
    await leave(); await pause(180)
    assert.equal(await mode(), 'widget widget--compact', 'normal hover exit')
    await enter(); await pause(180)
    inside = false // no DOM mouseleave: native fallback must recover
    await pause(450)
    assert.equal(await mode(), 'widget widget--compact', 'lost mouseleave recovery')
    await send({state:'approval'})
    assert.equal(await mode(), 'widget widget--approval')
    await send({})
    assert.equal(await mode(), 'widget widget--compact', 'approval resume does not restart preview')
    await send({taskId:'codex-b'})
    assert.equal(await mode(), 'widget widget--expanded', 'new task while already running gets preview')
    await pause(3100)
    assert.equal(await mode(), 'widget widget--compact')
    await send({taskId:'codex-b',state:'completed'})
    assert.equal(await mode(), 'widget widget--completed')
    for (const state of ['completed', 'approval', 'failed']) {
      await send({taskId:'codex-b',state})
      await win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,button:0})); window.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,button:0}));`)
      await pause(80)
    }
    assert.equal(opens, 3, 'all three result cards open their agent')
    assert.equal(details, 0, 'result cards do not open widget details')
    await send({taskId:'codex-c', state:'running'})
    await win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,button:0})); window.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,button:0}));`)
    await pause(80)
    assert.equal(details, 1, 'running card opens details')
    assert.equal(opens, 3, 'running card does not open the agent')
    console.log('PASS: preview expiry, hover exit, lost mouseleave, approval resume, consecutive tasks, completion')
    app.exit(0)
  } catch (error) { console.error(error); app.exit(1) }
})
