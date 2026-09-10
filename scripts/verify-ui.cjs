const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname,'..')
const sizes = {compact:{width:86,height:43},expanded:{width:200,height:200},completed:{width:104,height:104},failed:{width:140,height:140},approval:{width:140,height:140}}
const pause = ms => new Promise(r=>setTimeout(r,ms))
app.whenReady().then(async()=>{
  try {
    const win=new BrowserWindow({width:86,height:43,show:false,frame:false,transparent:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),autoplayPolicy:'no-user-gesture-required'}})
    ipcMain.handle('widget:pointer-inside',()=>true)
    ipcMain.handle('agent:get-progress',()=>null)
    ipcMain.handle('settings:get',()=>({soundEnabled:false,theme:'monochrome-lime',appearance:'dark',notifyEnabled:false,language:'en'}))
    ipcMain.on('widget:mode',(_,mode)=>win.setSize(sizes[mode].width,sizes[mode].height))
    await win.loadFile(path.join(root,'out/renderer/index.html'))
    await pause(100)
    const event={taskId:'verification',title:'Generate Market Report',source:'Codex',state:'running',progress:.42,stage:'执行任务',stageIndex:2,etaSeconds:null,estimated:true,message:'预估进度 · 以真实完成事件为准'}
    win.webContents.send('agent:progress',event)
    await pause(500)
    // A fresh task auto-expands the widget for ~3s, then collapses.
    const autoW = await win.webContents.executeJavaScript(`document.querySelector('.widget__card').getBoundingClientRect().width`)
    assert.equal(autoW, sizes.expanded.width)
    await pause(3500)
    for(const state of ['compact','expanded','completed']) {
      if(state==='expanded') await win.webContents.executeJavaScript(`document.querySelector('.widget').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`)
      if(state==='completed') win.webContents.send('agent:progress',{...event,state:'completed',progress:1})
      await pause(1000)
      const info=await win.webContents.executeJavaScript(`(()=>{const card=document.querySelector('.widget__card');const r=card.getBoundingClientRect();const t=document.querySelector('.widget__time');return {width:r.width,height:r.height,padding:getComputedStyle(document.querySelector('.widget')).padding,background:getComputedStyle(card).backgroundColor,radius:getComputedStyle(card).borderRadius,fontSize:t?getComputedStyle(t).fontSize:'',text:card.textContent}})()`)
      assert.equal(info.width,sizes[state].width);assert.equal(info.height,sizes[state].height);assert.equal(info.padding,'0px');assert.equal(info.background,'rgb(0, 0, 0)')
      if(state==='compact') {assert.equal(info.radius,'16px');assert.equal(info.fontSize,'21px')}
      if(state==='completed') {assert.ok(info.text.includes('Complete'));assert.ok(!info.text.includes('100%'))}
      fs.writeFileSync('/tmp/agent-pulse-'+state+'.png',(await win.capturePage()).toPNG())
      console.log(state,JSON.stringify(info))
    }
    await pause(3700)
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.widget').className`),'widget widget--completed')
    console.log('UI verified: compact rectangle + square states, black center surface, no outer padding, completion persists beyond old timeout.')
    app.exit(0)
  } catch(e) {console.error(e);app.exit(1)}
})
