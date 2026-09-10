import { execFile } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Terminal identifier captured by the approval hook ($TERM_PROGRAM, or 'Cursor'
// when the hook resolves the VS Code fork via its askpass path) → macOS bundle id.
const TERM_BUNDLES: Record<string, string> = {
  Apple_Terminal: 'com.apple.Terminal',
  'iTerm.app': 'com.googlecode.iterm2',
  vscode: 'com.microsoft.VSCode',
  Cursor: 'com.todesktop.230313mzl4w4u92',
  WarpTerminal: 'dev.warp.Warp-Stable',
  WezTerm: 'org.wezfurlong.wezterm',
  ghostty: 'com.mitchellh.ghostty'
}

const DEFAULT_BUNDLE = 'com.apple.Terminal'

const LOG_DIR = join(homedir(), 'Library', 'Logs', 'agent-pulse')
const LOG_PATH = join(LOG_DIR, 'open-agent.log')

/** Append one timestamped line so focus failures are diagnosable from a packaged app. */
export function logOpenAgent(line: string): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`)
  } catch {
    /* logging must never break the focus attempt */
  }
}

/** Resolve a $TERM_PROGRAM value to a macOS bundle id (falls back to Terminal). */
export function terminalBundle(terminalApp?: string): string {
  return (terminalApp && TERM_BUNDLES[terminalApp]) || DEFAULT_BUNDLE
}

/** Codex desktop has no TERM_PROGRAM; route it to its own application. */
export function agentBundle(source?: string, terminalApp?: string): string {
  return source === 'Codex' ? 'com.openai.codex' : terminalBundle(terminalApp)
}

/** Bring the application running this task to the foreground. */
export function focusAgentTerminal(terminalApp?: string, source?: string): void {
  const bundle = agentBundle(source, terminalApp)
  logOpenAgent(`focus terminalApp=${terminalApp ?? '<none>'} bundle=${bundle}`)
  // `open -b` launches/activates the app without needing Automation (TCC) permission.
  execFile('/usr/bin/open', ['-b', bundle], (err) => {
    if (err) {
      logOpenAgent(`open -b ${bundle} failed: ${err.message}`)
      return
    }
    logOpenAgent(`open -b ${bundle} ok`)

  })
}
