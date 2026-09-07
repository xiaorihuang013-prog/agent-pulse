const {app,BrowserWindow,ipcMain}=require('electron')
const assert=require('node:assert/strict')
const path=require('node:path')
const fs=require('node:fs')
const root=path.resolve(__dirname,'..')
const pause=ms=>new Promise(r=>setTimeout(r,ms))
app.whenReady().then(async()=>{
 try {
  const event={taskId:'details-test',title:'Codex',taskTitle:'Generate Market Report',state:'completed',progress:1,stage:'执行任务',stageIndex:2,etaSeconds:null,message:'Complete'}
  ipcMain.handle('agent:get-progress',()=>event)
  ipcMain.handle('settings:get',()=>({soundEnabled:false,theme:'monochrome-lime'}))
  let clicks=0;ipcMain.on('main:hide-to-widget',()=>clicks++)
  const win=new BrowserWindow({width:460,height:320,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'out/preload/index.js')}})
  await win.loadFile(path.join(root,'out/renderer/index.html'),{hash:'main'})
  await pause(250)
  const read=()=>win.webContents.executeJavaScript(`(()=>{const b=document.querySelector('button'),s=getComputedStyle(b),r=b.getBoundingClientRect();return {border:s.borderColor,outline:s.outlineStyle,shadow:s.boxShadow,x:r.x+r.width/2,y:r.y+r.height/2,state:document.querySelector('.m-state').textContent,center:getComputedStyle(document.querySelector('.mainview')).textAlign}})()`)
  await win.webContents.executeJavaScript('document.activeElement.blur()')
  win.webContents.sendInputEvent({type:'mouseMove',x:5,y:5});await pause(500)
  let r=await read();assert.equal(r.state,'completed · Generate Market Report');assert.equal(r.center,'center')
  const gray=r.border
  for(let i=0;i<3;i++) {
    win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(r.x),y:Math.round(r.y)})
    await pause(500);let hover=await read();assert.equal(hover.border,'rgb(227, 255, 63)');assert.equal(hover.outline,'none');assert.equal(hover.shadow,'none')
    win.webContents.sendInputEvent({type:'mouseDown',x:Math.round(r.x),y:Math.round(r.y),button:'left',clickCount:1})
    win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(r.x),y:Math.round(r.y),button:'left',clickCount:1})
    win.webContents.sendInputEvent({type:'mouseMove',x:5,y:5});await pause(500)
    r=await read();assert.equal(r.border,gray)
  }
  assert.equal(clicks,3)
  await win.webContents.executeJavaScript('document.querySelector("button").blur()')
  fs.writeFileSync('/tmp/agent-pulse-details.png',(await win.capturePage()).toPNG())
  console.log('PASS: initial completed snapshot, English title, centered text, 3 hover/click cycles with one border and no native outline.')
  app.exit(0)
 }catch(e){console.error(e);app.exit(1)}
})
