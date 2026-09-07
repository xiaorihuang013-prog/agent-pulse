const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname,'..')
const sizes = {compact:84,expanded:200,completed:104,failed:140,approval:140}
const pause = ms => new Promise(r=>setTimeout(r,ms))
app.whenReady().then(async()=>{
  try {
    const win=new BrowserWindow({width:84,height:84,show:false,frame:false,transparent:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),autoplayPolicy:'no-user-gesture-required'}})
    ipcMain.handle('agent:get-progress',()=>null)
    ipcMain.handle('settings:get',()=>({soundEnabled:false,theme:'monochrome-lime',appearance:'dark'}))
    ipcMain.on('widget:mode',(_,mode)=>win.setSize(sizes[mode],sizes[mode]))
    await win.loadFile(path.join(root,'out/renderer/index.html'))
    await pause(100)
    const event={taskId:'verification',title:'Codex',state:'running',progress:.42,stage:'执行任务',stageIndex:2,etaSeconds:null,estimated:true,message:'预估进度 · 以真实完成事件为准'}
    win.webContents.send('agent:progress',event)
    await pause(500)
    for(const state of ['compact','expanded','completed']) {
      if(state==='expanded') await win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`)
      if(state==='completed') win.webContents.send('agent:progress',{...event,state:'completed',progress:1})
      await pause(1000)
      const info=await win.webContents.executeJavaScript(`(()=>{const card=document.querySelector('.widget__card');const r=card.getBoundingClientRect();return {width:r.width,height:r.height,padding:getComputedStyle(document.querySelector('.widget')).padding,background:getComputedStyle(card).backgroundColor,text:card.textContent}})()`)
      assert.equal(info.width,sizes[state]);assert.equal(info.width,info.height);assert.equal(info.padding,'0px');assert.equal(info.background,'rgb(0, 0, 0)')
      if(state==='completed') {assert.ok(info.text.includes('Complete'));assert.ok(!info.text.includes('100%'))}
      fs.writeFileSync('/tmp/agent-pulse-'+state+'.png',(await win.capturePage()).toPNG())
      console.log(state,JSON.stringify(info))
    }
    await pause(3700)
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.widget').className`),'widget widget--completed')
    console.log('UI verified: square bounds, black center surface, no outer padding, completion persists beyond old timeout.')
    app.exit(0)
  } catch(e) {console.error(e);app.exit(1)}
})
