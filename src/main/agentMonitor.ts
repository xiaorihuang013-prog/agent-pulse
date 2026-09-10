import { readdir, stat, open, readFile, unlink } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { taskTitleFromPrompt, promptText } from './taskTitle'
import type { ProgressEvent } from '../shared/types'
import { t } from '../shared/i18n'
import type { I18nKey, Lang } from '../shared/i18n'
import { getLanguage } from './settings'

type Source = 'Codex' | 'Claude Code'
type Signal = { kind: 'start' | 'activity' | 'complete' | 'compact' | 'cancel' | 'fail' | 'title' | 'approval' | 'resume'; requestId?: string; stage?: number; id?: string; title?: string; terminalApp?: string; activity?: string; fromAi?: boolean }
type RecordData = Record<string, any>
const STAGE_KEYS: I18nKey[] = ['stage0', 'stage1', 'stage2', 'stage3']
const ACT_KEYS: I18nKey[] = ['act0', 'act1', 'act2', 'act3']
// Estimated stage floors: understanding 10%, gathering 20%, execution 50%, review 15%.
// The final 5% is reserved for an explicit completion event.
const floors = [0.02, 0.1, 0.3, 0.8]
// Tasks untouched this long are considered abandoned (crashed/forgotten session),
// so they drop out of the active set instead of resurfacing as phantom "waiting" tasks.
const STALE_TIMEOUT_MS = 15 * 60 * 1000
// How long a terminal card (completed/failed/cancelled) stays visible before idling.
const TERMINAL_GRACE_MS = 30 * 1000

// Local CLI commands (/clear, /model …) and their transcript bookkeeping are not agent
// tasks: they are handled by the CLI and never produce an end_turn, so tracking them
// would leave a phantom "running" task forever.
function isLocalCommandArtifact(content: unknown): boolean {
  if (typeof content === 'string') {
    const s = content.trim()
    if (s.startsWith('/')) return true
    if (/<(?:command-name|command-message|command-args|local-command-stdout|local-command-stderr|local-command-caveat)\b/.test(s)) return true
  }
  return false
}

// A context compaction ends the current chunk of work. Recognize the /compact command,
// its <command-name> bookkeeping, and the injected compact summary, so the tracker marks
// the active task complete instead of leaving it "running" forever.
function isCompactEvent(row: RecordData, content: unknown): boolean {
  if (row.isCompactSummary) return true
  if (typeof content === 'string') {
    const s = content.trim()
    if (/^\/compact\b/.test(s)) return true
    if (/<command-name>\s*\/compact/i.test(s)) return true
  }
  return false
}

export function parseSignal(source: Source, row: RecordData, lang: Lang = 'en'): Signal | null {
  if (source === 'Codex') {
    const p = row.payload ?? {}
    if (row.type === 'event_msg') {
      if (p.type === 'user_message') return { kind: 'title', title: taskTitleFromPrompt(promptText(p.message), lang) }
      if (p.type === 'task_started') return { kind: 'start', id: p.turn_id }
      if (p.type === 'task_complete') return { kind: 'complete', id: p.turn_id }
      if (p.type === 'error' && p.will_retry === false) return { kind: 'fail', id: p.turn_id }
      if (p.type === 'turn_aborted') return { kind: 'cancel', id: p.turn_id }
      if (p.type === 'agent_reasoning') return { kind: 'activity', stage: 0 }
    }
    if (row.type === 'response_item' && p.type === 'message' && p.role === 'user') {
      const text = promptText(p.content)
      if (text && !text.startsWith('<environment_context>')) return { kind: 'title', title: taskTitleFromPrompt(text, lang) }
    }
    if (row.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(p.type)) {
      return { kind: 'activity', stage: toolStage(p.name, p.arguments ?? p.input), activity: describeActivity(p.name, p.arguments ?? p.input, lang) }
    }
  } else {
    if (row.isSidechain || row.isMeta) return null
    const m = row.message ?? {}
    if (row.isApiErrorMessage) return { kind: 'fail' }
    if (row.type === 'ai-title' && typeof row.aiTitle === 'string' && row.aiTitle) return { kind: 'title', title: row.aiTitle, fromAi: true }
    if (row.type === 'agent-name' && typeof row.agentName === 'string' && row.agentName) return { kind: 'title', title: row.agentName, fromAi: true }
    if (row.type === 'user') {
      const c = m.content
      if (Array.isArray(c) && c.some((b: RecordData) => b.type === 'tool_result')) return { kind: 'resume' }
      if (typeof c === 'string' && c.startsWith('[Request interrupted by user')) return { kind: 'cancel' }
      if (isCompactEvent(row, c)) return { kind: 'compact' }
      if (isLocalCommandArtifact(c)) return null
      if (typeof c === 'string' || (Array.isArray(c) && c.some((b: RecordData) => b.type === 'text'))) {
        return { kind: 'start', id: row.uuid, title: taskTitleFromPrompt(promptText(c), lang) }
      }
    }
    if (row.type === 'assistant') {
      if (m.stop_reason === 'end_turn') return { kind: 'complete' }
      const tool = Array.isArray(m.content) && m.content.find((b: RecordData) => b.type === 'tool_use')
      if (tool) return { kind: 'activity', stage: toolStage(tool.name, tool.input), activity: describeActivity(tool.name, tool.input, lang) }
      return { kind: 'activity', stage: 0 }
    }
  }
  return null
}

function toolStage(name: unknown, input: unknown): number {
  const tool = String(name ?? '').toLowerCase()
  const command = typeof input === 'string' ? input : JSON.stringify(input ?? {})
  if (/\b(test|typecheck|pytest|vitest|verify)\b/i.test(command)) return 3
  if (/read|search|glob|grep|browse|fetch/.test(tool)) return 1
  return 2
}

/** Codex encodes arguments as a JSON string; Claude passes a plain object. */
function normalizeInput(input: unknown): RecordData {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object') return parsed
    } catch { /* not JSON — e.g. Codex exec code */ }
  }
  return input && typeof input === 'object' ? (input as RecordData) : {}
}

function truncate(s: string, n = 60): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Human-readable current step derived from the tool name + its arguments.
 * Tool verbs are localized via i18n; operands (file paths, commands, descriptions)
 * are real content and stay verbatim. */
function describeActivity(name: unknown, input: unknown, lang: Lang): string {
  const raw = String(name ?? '')
  const tool = raw.toLowerCase()
  const arg = normalizeInput(input)
  if (tool === 'bash') {
    if (typeof arg.description === 'string' && arg.description) return `Bash: ${truncate(arg.description)}`
    if (typeof arg.command === 'string') return `Bash: ${truncate(arg.command)}`
  }
  if (tool === 'read' && typeof arg.file_path === 'string') return `${t(lang, 'actRead')} ${basename(arg.file_path)}`
  if (tool === 'edit' && typeof arg.file_path === 'string') return `${t(lang, 'actEdit')} ${basename(arg.file_path)}`
  if (tool === 'write' && typeof arg.file_path === 'string') return `${t(lang, 'actWrite')} ${basename(arg.file_path)}`
  if (tool === 'notebookedit') return typeof arg.notebook_path === 'string' ? `${t(lang, 'actEdit')} ${basename(arg.notebook_path)}` : t(lang, 'actEditNotebook')
  if (tool === 'taskcreate' && typeof arg.subject === 'string') return truncate(arg.subject)
  if (tool === 'agent' && typeof arg.description === 'string' && arg.description) return truncate(arg.description)
  if (tool === 'websearch' && typeof arg.query === 'string') return `${t(lang, 'actSearch')} ${truncate(arg.query)}`
  if (tool === 'webfetch' && typeof arg.url === 'string') return `${t(lang, 'actFetch')} ${truncate(arg.url)}`
  if (tool === 'skill' && typeof arg.skill === 'string') return `${t(lang, 'actSkill')} ${arg.skill}`
  // Codex tools
  if (tool === 'exec') {
    const rawArgs = typeof input === 'string' ? input : JSON.stringify(input ?? {})
    const m = /cmd\s*:\s*["'`]([^"'`]{1,120})/.exec(rawArgs)
    return m ? `exec: ${m[1]}` : 'exec'
  }
  if (tool === 'js' && typeof arg.title === 'string') return truncate(arg.title)
  if (tool === 'request_user_input_async') return t(lang, 'actWaitingInput')
  return raw || t(lang, 'actWorking')
}

interface Task {
  id: string; title: string; fromAi: boolean; source: Source; state: ProgressEvent['state']; stage: number
  start: number; touched: number; progress: number; activities: number; notice: number; approvalSince?: number; requestId?: string; terminalApp?: string; activity?: string
}

export class TaskTracker {
  private tasks = new Map<string, Task>()
  private terminal: { task: Task; until: number } | null = null
  private pendingTitles = new Map<string, { title: string; fromAi: boolean }>()
  /** Returns a terminal marker when this signal flips a task into a terminal state. */
  accept(key: string, source: Source, signal: Signal, now = Date.now()): 'completed' | 'failed' | 'cancelled' | null {
    let task = this.tasks.get(key)
    if (signal.kind === 'title') {
      const entry = { title: signal.title ?? t(getLanguage(), 'agentTask'), fromAi: signal.fromAi ?? false }
      if (task && ['running', 'waiting', 'approval'].includes(task.state)) { task.title = entry.title; task.fromAi = entry.fromAi }
      else this.pendingTitles.set(key, entry)
      return null
    }
    if (signal.kind === 'start') {
      if (task?.id === signal.id) return null
      this.terminal = null // Only an explicit new task dismisses the previous result.
      const pending = this.pendingTitles.get(key)
      task = { id: signal.id ?? `${key}:${now}`, title: signal.title ?? pending?.title ?? t(getLanguage(), 'agentTask'), fromAi: signal.fromAi ?? pending?.fromAi ?? false, source, state: 'running', stage: 0,
        start: now, touched: now, progress: 0.02, activities: 0, notice: 0 }
      this.tasks.set(key, task)
      this.pendingTitles.delete(key)
      // Bound retained terminal history; active tasks are never evicted.
      if (this.tasks.size > 128) {
        for (const [k, t] of this.tasks) {
          if (!['running', 'waiting', 'approval'].includes(t.state)) this.tasks.delete(k)
          if (this.tasks.size <= 128) break
        }
      }
      return null
    }
    if (!task || !['running', 'waiting', 'approval'].includes(task.state)) return null
    if (signal.id && signal.id !== task.id) return null
    if (task.state === 'approval' && signal.kind === 'activity') return null
    task.touched = now
    if (signal.kind === 'approval') {
      if (task.state !== 'approval') { task.notice++; task.approvalSince = now }
      task.state = 'approval'; task.requestId = signal.requestId
      if (signal.terminalApp) task.terminalApp = signal.terminalApp
      return null
    }
    if (task.approvalSince !== undefined) {
      task.start += now - task.approvalSince
      task.approvalSince = undefined
    }
    if (signal.kind === 'complete' || signal.kind === 'compact') {
      task.state = 'completed'
      task.progress = 1
      // Keep completion visible until an explicit new task starts.
      this.terminal = { task: { ...task }, until: Infinity }
      return 'completed'
    }
    if (signal.kind === 'fail') { task.state = 'failed'; task.notice++; this.terminal = { task: { ...task }, until: now + TERMINAL_GRACE_MS }; return 'failed' }
    if (signal.kind === 'cancel') { task.state = 'cancelled'; this.terminal = { task: { ...task }, until: now + TERMINAL_GRACE_MS }; return 'cancelled' }
    task.state = 'running'
    task.stage = Math.max(task.stage, signal.stage ?? task.stage)
    task.activities++
    if (signal.activity) task.activity = signal.activity
    return null
  }

  hook(key: string, source: Source, signal: Signal, now = Date.now()): 'completed' | 'failed' | 'cancelled' | null {
    const matching = signal.id && [...this.tasks.entries()].find(([,t]) => t.source === source && t.id === signal.id)
    key = matching ? matching[0] : key
    if (!this.tasks.has(key)) {
      if (signal.kind !== 'approval' && signal.kind !== 'fail') return null
      this.accept(key, source, {kind: 'start', id: signal.id ?? key}, now)
    }
    return this.accept(key, source, signal, now)
  }

  snapshot(now = Date.now()): ProgressEvent | null {
    // Drop tasks abandoned long ago so they don't resurface as phantom "waiting"
    // tasks after other work completes (the "default/demo state" regression).
    for (const [k, t] of this.tasks) {
      if ((t.state === 'running' || t.state === 'waiting') && now - t.touched > STALE_TIMEOUT_MS) {
        this.tasks.delete(k)
      }
    }
    const all = [...this.tasks.values()]
    const active = all.filter(t => ['running', 'waiting', 'approval'].includes(t.state))
    const approvals = active.filter(t => t.state === 'approval')
    const terminal = this.terminal && now < this.terminal.until ? this.terminal.task : null
    // Priority: approval > recent terminal state > newest active task; otherwise idle.
    const task = approvals[0] ?? terminal ?? (active.length ? active.sort((a, b) => b.touched - a.touched)[0] : null)
    if (!task) return null
    const lang = getLanguage()
    if (task.state === 'running' || task.state === 'waiting') {
      // No fabricated completion: an idle/crashed agent remains waiting at <=95%.
      task.state = now - task.touched > 90000 ? 'waiting' : 'running'
      const elapsed = Math.min(now, task.touched + 15000) - task.start
      const estimate = 0.02 + 0.73 * (1 - Math.exp(-elapsed / 180000))
      task.progress = Math.min(0.95, Math.max(task.progress, floors[task.stage], estimate,
        0.02 + 0.7 * (1 - Math.exp(-task.activities / 24))))
    }
    const stageKey = STAGE_KEYS[task.stage] ?? 'stage2'
    const actKey = ACT_KEYS[task.stage] ?? 'act2'
    const message =
      task.state === 'approval' ? t(lang, 'msgApproval')
      : task.state === 'completed' ? t(lang, 'complete')
      : task.state === 'failed' ? t(lang, 'msgError')
      : task.state === 'waiting' ? t(lang, 'msgWaiting')
      : t(lang, actKey)
    return {
      taskId: task.id, noticeId: `${task.id}:${task.notice}`,
      source: task.source,
      terminalApp: task.terminalApp,
      title: task.title,
      titleFromAi: task.fromAi,
      state: task.state, progress: task.progress, stage: t(lang, stageKey), stageIndex: task.stage,
      activity: task.activity,
      etaSeconds: null, estimated: true,
      message,
      error: task.state === 'failed' ? t(lang, 'msgError') : undefined,
      startedAt: task.start
    }
  }

  /** Drop terminal tasks so a baseline backfill surfaces only still-active work. */
  pruneTerminal(): void {
    this.terminal = null
    for (const [k, t] of this.tasks) {
      if (['completed', 'failed', 'cancelled'].includes(t.state)) this.tasks.delete(k)
    }
  }
}

interface Cursor { offset: number; pending: Buffer; source: Source; inode: number }

/** Read-only local transcript adapter. Never uploads or stores task text. */
export class AgentMonitor {
  private cursors = new Map<string, Cursor>()
  private tracker = new TaskTracker()
  private timer: ReturnType<typeof setTimeout> | null = null
  private stopped = false
  // Start as "idle" (null) so a baseline poll with no active task doesn't emit.
  private last = 'null'
  private startedAt = Date.now()
  constructor(private listener: (event: ProgressEvent | null) => void,
    private roots: [string, Source][] = [
      [join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'sessions'), 'Codex'],
      [join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects'), 'Claude Code']
    ], private hookDirectory: string | null = join(homedir(), 'Library/Application Support/agent-pulse/hook-events')) {}

  async start(): Promise<void> {
    this.startedAt = Date.now()
    await this.poll(true)
    this.schedule()
  }
  stop(): void { this.stopped = true; if (this.timer) clearTimeout(this.timer) }
  private schedule(): void {
    if (this.stopped) return
    this.timer = setTimeout(async () => {
      try { await this.poll(false) } catch (error) { console.error('[monitor]', error) }
      this.schedule()
    }, 1200)
  }
  /** Reconstruct still-active tasks from an existing session file on startup. */
  private async backfill(path: string, source: Source): Promise<void> {
    const info = await stat(path)
    const MAX = 8 * 1024 * 1024
    let start = 0
    let size = info.size
    if (size > MAX) { start = size - MAX; size = MAX }
    const buf = Buffer.alloc(size)
    const handle = await open(path, 'r')
    try {
      const { bytesRead } = await handle.read(buf, 0, size, start)
      let data = buf.subarray(0, bytesRead)
      if (start > 0) {
        const nl = data.indexOf(10)
        data = nl === -1 ? Buffer.alloc(0) : data.subarray(nl + 1)
      }
      let from = 0
      for (let end = data.indexOf(10); end !== -1; end = data.indexOf(10, from)) {
        try {
          const row = JSON.parse(data.subarray(from, end).toString('utf8'))
          const ts = Date.parse(row.timestamp)
          const signal = parseSignal(source, row, getLanguage())
          // Use the original timestamp so a long-dead "running" task is not
          // resurrected as if it had just started.
          if (signal) this.tracker.accept(path, source, signal, Number.isFinite(ts) ? ts : Date.now())
        } catch { /* partial/malformed record is not a lifecycle event */ }
        from = end + 1
      }
    } finally { await handle.close() }
    this.cursors.set(path, { offset: info.size, pending: Buffer.alloc(0), source, inode: info.ino })
  }
  async poll(baseline = false): Promise<void> {
    const seen = new Set<string>()
    for (const [root, source] of this.roots) {
      for (const path of await this.files(root)) {
        seen.add(path)
        try {
          if (baseline) {
            await this.backfill(path, source)
            continue
          }
          const info = await stat(path)
          let cursor = this.cursors.get(path)
          if (!cursor) {
            cursor = { offset: info.mtimeMs < this.startedAt ? info.size : 0,
              pending: Buffer.alloc(0), source, inode: info.ino }
            this.cursors.set(path, cursor)
          }
          if (cursor.inode !== info.ino || info.size < cursor.offset) {
            cursor.offset = 0; cursor.pending = Buffer.alloc(0); cursor.inode = info.ino
          }
          if (info.size === cursor.offset) continue
          const handle = await open(path, 'r')
          try {
            // Incremental and bounded reads, including split UTF-8/JSON lines.
            const buffer = Buffer.alloc(Math.min(info.size - cursor.offset, 1024 * 1024))
            const { bytesRead } = await handle.read(buffer, 0, buffer.length, cursor.offset)
            cursor.offset += bytesRead
            const data = Buffer.concat([cursor.pending, buffer.subarray(0, bytesRead)])
            let from = 0
            for (let end = data.indexOf(10); end !== -1; end = data.indexOf(10, from)) {
              try {
                const row = JSON.parse(data.subarray(from, end).toString('utf8'))
                // Ignore replayed history in newly copied/forked session files.
                if (Date.parse(row.timestamp) >= this.startedAt) {
                  const signal = parseSignal(source, row, getLanguage())
                  // Flush a terminal transition immediately so a completion is not
                  // hidden by a new task that starts within the same poll cycle.
                  if (signal && this.tracker.accept(path, source, signal)) this.emit()
                }
              } catch { /* partial/malformed record is not a lifecycle event */ }
              from = end + 1
            }
            cursor.pending = data.subarray(from)
          } finally { await handle.close() }
        } catch { /* session may be removed while scanning */ }
      }
    }
    if (baseline) this.tracker.pruneTerminal()
    for (const path of this.cursors.keys()) if (!seen.has(path)) this.cursors.delete(path)
    await this.readHooks()
    this.emit()
  }
  /** Emit the current snapshot to the listener only when it changed since last emit. */
  private emit(force = false): void {
    const snapshot = this.tracker.snapshot()
    const serialized = JSON.stringify(snapshot)
    // Emit the idle (null) transition too, so the renderer clears stale task text.
    if (force || serialized !== this.last) { this.last = serialized; this.listener(snapshot) }
  }
  /** Re-publish the authoritative snapshot on demand (e.g. after the demo ends). */
  refresh(): void { this.emit(true) }
  private async readHooks(): Promise<void> {
    const dir = this.hookDirectory
    if (!dir) return
    try {
      const events: {file: string; row: RecordData}[] = []
      for (const file of await readdir(dir)) {
        if (!file.endsWith('.json')) continue
        const path = join(dir, file)
        try {
          const row = JSON.parse(await readFile(path, 'utf8'))
          if (row.timestamp >= this.startedAt && row.timestamp <= Date.now() + 5000) events.push({file:path,row})
          else await unlink(path)
        } catch { /* incomplete notification is ignored */ }
      }
      for (const {file,row} of events.sort((a,b)=>a.row.timestamp-b.row.timestamp)) {
        if (['Codex','Claude Code'].includes(row.source) && ['approval','resume','cancel','fail'].includes(row.kind) && typeof row.path === 'string') {
          if (this.tracker.hook(row.path, row.source, {kind:row.kind,id:row.id,requestId:row.requestId,terminalApp:row.terminalApp})) this.emit()
        }
        await unlink(file)
      }
    } catch { /* hook integration has not been installed yet */ }
  }
  private async files(root: string, depth = 0): Promise<string[]> {
    if (depth > 4) return []
    try {
      const entries = await readdir(root, { withFileTypes: true })
      const result: string[] = []
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'subagents') result.push(...await this.files(join(root, entry.name), depth + 1))
        else if (entry.isFile() && entry.name.endsWith('.jsonl') && !basename(entry.name).startsWith('agent-')) result.push(join(root, entry.name))
      }
      return result
    } catch { return [] }
  }
}
