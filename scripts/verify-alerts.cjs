const {app,BrowserWindow,ipcMain}=require('electron')
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict')
const pause=ms=>new Promise(r=>setTimeout(r,ms)),root=path.resolve(__dirname,'..')
app.whenReady().then(async()=>{
 try {
  const win=new BrowserWindow({width:86,height:43,frame:false,transparent:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'out/preload/index.js')}})
  ipcMain.handle('agent:get-progress',()=>null)
  ipcMain.handle('settings:get',()=>({soundEnabled:true,theme:'monochrome-lime',appearance:'dark',notifyEnabled:false,language:'en'}))
  ipcMain.on('widget:mode',(_,m)=>{const n={compact:[86,43],expanded:[200,200],approval:[140,140],failed:[140,140],completed:[104,104]}[m];win.setSize(n[0],n[1])})
  await win.loadFile(path.join(root,'out/renderer/index.html'));await pause(100)
  await win.webContents.executeJavaScript(`window.notes=[];window.AudioContext=class {
    state='running';currentTime=0;destination={};
    createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){},start(){window.notes.push(o.frequency.value)},stop(){}};return o}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
  };void 0`)
  const base={taskId:'alert-test',noticeId:'1',title:'Run Checks',source:'Codex',progress:.42,stage:'Review',stageIndex:3,etaSeconds:null,message:''}
  const send=async state=>{win.webContents.send('agent:progress',{...base,state,error:state==='failed'?'Unable to finish task':undefined});await pause(200)}
  await send('running');await send('approval')
  assert.deepEqual(await win.webContents.executeJavaScript('window.notes'),[783.99,783.99,1046.5])
  await send('approval')
  assert.equal(await win.webContents.executeJavaScript('window.notes.length'),3)
  assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.approval').textContent.includes('Return to Codex')`))
  fs.writeFileSync('/tmp/agent-pulse-approval.png',(await win.capturePage()).toPNG())
  await send('running');await send('failed')
  assert.deepEqual(await win.webContents.executeJavaScript('window.notes.slice(3)'),[392,293.66,196])
  await send('failed');assert.equal(await win.webContents.executeJavaScript('window.notes.length'),6)
  await pause(600);fs.writeFileSync('/tmp/agent-pulse-failed.png',(await win.capturePage()).toPNG())
  win.webContents.send('settings:changed',{soundEnabled:false,theme:'monochrome-lime',appearance:'dark',notifyEnabled:false,language:'en'});await pause(100)
  await send('running');await send('approval');assert.equal(await win.webContents.executeJavaScript('window.notes.length'),6)
  console.log('PASS: distinct approval/failure tones, no repeated sound on duplicate snapshots, mute honored, both square alert views rendered.')
  app.exit(0)
 }catch(e){console.error(e);app.exit(1)}
})
