// Install only this project's per-user background monitor. No Agent settings are changed.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const label = 'com.eightsuns.agent-pulse'
const dir = path.join(os.homedir(), 'Library', 'LaunchAgents')
const plist = path.join(dir, label + '.plist')
const target = `gui/${process.getuid()}`
if (process.argv.includes('--uninstall')) {
  try { execFileSync('/bin/launchctl', ['bootout', `${target}/${label}`], {stdio:'pipe'}) } catch {}
  fs.rmSync(plist, {force:true});console.log('Agent Pulse background service removed.');process.exit(0)
}
const electron = require('electron')
if (!fs.existsSync(path.join(root, 'out/main/index.js'))) throw Error('Run npm run build first')
const xml = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
const logs = path.join(os.homedir(), 'Library', 'Logs', 'Agent Pulse')
fs.mkdirSync(dir, {recursive:true});fs.mkdirSync(logs, {recursive:true})
const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(electron)}</string><string>${xml(root)}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${xml(path.join(logs,'stdout.log'))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(logs,'stderr.log'))}</string>
</dict></plist>`
try { execFileSync('/bin/launchctl', ['bootout', `${target}/${label}`], {stdio:'pipe'}) } catch {}
fs.writeFileSync(plist,body)
execFileSync('/bin/launchctl',['bootstrap',target,plist])
console.log(`Installed and started ${label}`)
