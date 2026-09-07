import { execFile } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// $TERM_PROGRAM (captured by the approval hook) → macOS bundle id.
const TERM_BUNDLES: Record<string, string> = {
  Apple_Terminal: 'com.apple.Terminal',
  'iTerm.app': 'com.googlecode.iterm2',
  vscode: 'com.microsoft.VSCode',
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

/** Bring the terminal running the agent to the foreground. */
export function focusAgentTerminal(terminalApp?: string): void {
  const bundle = terminalBundle(terminalApp)
  logOpenAgent(`focus terminalApp=${terminalApp ?? '<none>'} bundle=${bundle}`)
  // `open -b` launches/activates the app without needing Automation (TCC) permission.
  execFile('/usr/bin/open', ['-b', bundle], (err) => {
    if (err) {
      logOpenAgent(`open -b ${bundle} failed: ${err.message}`)
      return
    }
    logOpenAgent(`open -b ${bundle} ok`)
    // Force it frontmost over the always-on-top widget; may prompt TCC on first use.
    execFile('/usr/bin/osascript', ['-e', `tell application id "${bundle}" to activate`], (err2) => {
      if (err2) logOpenAgent(`osascript activate ${bundle} failed: ${err2.message}`)
      else logOpenAgent(`osascript activate ${bundle} ok`)
    })
  })
}
