import { execFile } from 'node:child_process'

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

/** Resolve a $TERM_PROGRAM value to a macOS bundle id (falls back to Terminal). */
export function terminalBundle(terminalApp?: string): string {
  return (terminalApp && TERM_BUNDLES[terminalApp]) || DEFAULT_BUNDLE
}

/** Bring the terminal running the agent to the foreground. */
export function focusAgentTerminal(terminalApp?: string): void {
  const bundle = terminalBundle(terminalApp)
  execFile('/usr/bin/open', ['-b', bundle], (err) => {
    if (err) console.error('[open-agent]', err)
  })
}
