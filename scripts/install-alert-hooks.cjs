const fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const home=os.homedir(),script=path.join(__dirname,'agent-notify.py')
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'"
for(const [source,file,events] of [
 ['Codex',path.join(process.env.CODEX_HOME||path.join(home,'.codex'),'hooks.json'),['PermissionRequest','PostToolUse','Stop','Interrupt']],
 ['Claude Code',path.join(process.env.CLAUDE_CONFIG_DIR||path.join(home,'.claude'),'settings.json'),['PermissionRequest','PostToolUse','PostToolUseFailure','StopFailure','Stop','Notification']]
]) {
 const exists=fs.existsSync(file), data=exists?JSON.parse(fs.readFileSync(file,'utf8')):{}
 data.hooks??={}
 for(const event of events) {
  const groups=data.hooks[event]??=[]
  const command=`/usr/bin/python3 ${quote(script)} ${quote(source)}`
  if(groups.some(g=>g.hooks?.some(h=>h.command===command))) continue
  groups.push({...(event==='Notification'?{matcher:'permission_prompt'}:{}),hooks:[{type:'command',command,timeout:2}]})
 }
 fs.mkdirSync(path.dirname(file),{recursive:true})
 if(exists) fs.copyFileSync(file,file+'.agent-pulse-backup-'+Date.now())
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600})
 console.log(`Added notification-only hooks for ${source}: ${file}`)
}
