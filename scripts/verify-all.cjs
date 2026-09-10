const { spawnSync } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
for (const script of ['verify-ui.cjs', 'verify-details.cjs', 'verify-alerts.cjs', 'verify-expansion.cjs']) {
  const result = spawnSync(require('electron'), [path.join(__dirname, script)], {
    cwd: root, stdio: 'inherit', timeout: 60000
  })
  if (result.error) console.error(result.error.message)
  if (result.status !== 0) process.exit(result.status || 1)
}
