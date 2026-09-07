import { readdir, stat, open, readFile, unlink } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { taskTitleFromPrompt, promptText } from './taskTitle'
import type { ProgressEvent } from '../shared/types'

type Source = 'Codex' | 'Claude Code'
type Signal = { kind: 'start' | 'activity' | 'complete' | 'cancel' | 'fail' | 'title' | 'approval' | 'resume'; requestId?: string; stage?: number; id?: string; title?: string }
type RecordData = Record<string, any>
const stages = ['理解任务', '收集信息', '执行任务', '检查结果']
// Estimated stage floors: understanding 10%, gathering 20%, execution 50%, review 15%.
// The final 5% is reserved for an explicit completion event.
const floors = [0.02, 0.1, 0.3, 0.8]

export function parseSignal(source: Source, row: RecordData): Signal | null {
  if (source === 'Codex') {
    const p = row.payload ?? {}
    if (row.type === 'event_msg') {
      if (p.type === 'user_message') return { kind: 'title', title: taskTitleFromPrompt(promptText(p.message)) }
      if (p.type === 'task_started') return { kind: 'start', id: p.turn_id }
      if (p.type === 'task_complete') return { kind: 'complete', id: p.turn_id }
      if (p.type === 'error' && p.will_retry === false) return { kind: 'fail', id: p.turn_id }
      if (p.type === 'turn_aborted') return { kind: 'cancel', id: p.turn_id }
      if (p.type === 'agent_reasoning') return { kind: 'activity', stage: 0 }
    }
    if (row.type === 'response_item' && p.type === 'message' && p.role === 'user') {
      const text = promptText(p.content)
      if (text && !text.startsWith('<environment_context>')) return { kind: 'title', title: taskTitleFromPrompt(text) }
    }
    if (row.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(p.type)) {
      return { kind: 'activity', stage: toolStage(p.name, p.arguments ?? p.input) }
    }
  } else {
    if (row.isSidechain || row.isMeta) return null
    const m = row.message ?? {}
    if (row.isApiErrorMessage) return { kind: 'fail' }
    if (row.type === 'user') {
      const c = m.content
      if (Array.isArray(c) && c.some((b: RecordData) => b.type === 'tool_result')) return { kind: 'resume' }
      if (typeof c === 'string' && c.startsWith('[Request interrupted by user')) return { kind: 'cancel' }
      if (typeof c === 'string' || (Array.isArray(c) && c.some((b: RecordData) => b.type === 'text'))) {
        return { kind: 'start', id: row.uuid, title: taskTitleFromPrompt(promptText(c)) }
      }
    }
    if (row.type === 'assistant') {
      if (m.stop_reason === 'end_turn') return { kind: 'complete' }
      const tool = Array.isArray(m.content) && m.content.find((b: RecordData) => b.type === 'tool_use')
      if (tool) return { kind: 'activity', stage: toolStage(tool.name, tool.input) }
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

interface Task {
  id: string; title: string; source: Source; state: ProgressEvent['state']; stage: number
  start: number; touched: number; progress: number; activities: number; notice: number; approvalSince?: number; requestId?: string
}

export class TaskTracker {
  private tasks = new Map<string, Task>()
  private pendingTitles = new Map<string, string>()
  accept(key: string, source: Source, signal: Signal, now = Date.now()): void {
    let task = this.tasks.get(key)
    if (signal.kind === 'title') {
      if (task && ['running', 'waiting', 'approval'].includes(task.state)) task.title = signal.title ?? 'Agent Task'
      else this.pendingTitles.set(key, signal.title ?? 'Agent Task')
      return
    }
    if (signal.kind === 'start') {
      if (task?.id === signal.id) return
      task = { id: signal.id ?? `${key}:${now}`, title: signal.title ?? this.pendingTitles.get(key) ?? 'Agent Task', source, state: 'running', stage: 0,
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
      return
    }
    if (!task || !['running', 'waiting', 'approval'].includes(task.state)) return
    if (signal.id && signal.id !== task.id) return
    if (task.state === 'approval' && signal.kind === 'activity') return
    task.touched = now
    if (signal.kind === 'approval') {
      if (task.state !== 'approval') { task.notice++; task.approvalSince = now }
      task.state = 'approval'; task.requestId = signal.requestId
      return
    }
    if (task.approvalSince !== undefined) {
      task.start += now - task.approvalSince
      task.approvalSince = undefined
    }
    if (signal.kind === 'complete') { task.state = 'completed'; task.progress = 1 }
    else if (signal.kind === 'fail') { task.state = 'failed'; task.notice++ }
    else if (signal.kind === 'cancel') task.state = 'cancelled'
    else {
      task.state = 'running'
      task.stage = Math.max(task.stage, signal.stage ?? task.stage)
      task.activities++
    }
  }

  hook(key: string, source: Source, signal: Signal, now = Date.now()): void {
    const matching = signal.id && [...this.tasks.entries()].find(([,t]) => t.source === source && t.id === signal.id)
    key = matching ? matching[0] : key
    if (!this.tasks.has(key)) {
      if (signal.kind !== 'approval' && signal.kind !== 'fail') return
      this.accept(key, source, {kind: 'start', id: signal.id ?? key}, now)
    }
    this.accept(key, source, signal, now)
  }

  snapshot(now = Date.now()): ProgressEvent | null {
    const all = [...this.tasks.values()]
    const active = all.filter(t => ['running', 'waiting', 'approval'].includes(t.state))
    const approvals = active.filter(t => t.state === 'approval')
    const newest = [...all].sort((a,b) => b.touched-a.touched)[0]
    const task = approvals[0] ?? (newest?.state === 'failed' ? newest : (active.length ? active : all).sort((a, b) => b.touched - a.touched)[0])
    if (!task) return null
    if (task.state === 'running' || task.state === 'waiting') {
      // No fabricated completion: an idle/crashed agent remains waiting at <=95%.
      task.state = now - task.touched > 90000 ? 'waiting' : 'running'
      const elapsed = Math.min(now, task.touched + 15000) - task.start
      const estimate = 0.02 + 0.73 * (1 - Math.exp(-elapsed / 180000))
      task.progress = Math.min(0.95, Math.max(task.progress, floors[task.stage], estimate,
        0.02 + 0.7 * (1 - Math.exp(-task.activities / 24))))
    }
    return {
      taskId: task.id, noticeId: `${task.id}:${task.notice}`, taskTitle: task.title, title: `${task.source}${active.length > 1 ? ` · ${active.length} 个任务运行中` : ''}`,
      state: task.state, progress: task.progress, stage: stages[task.stage], stageIndex: task.stage,
      etaSeconds: null, estimated: true,
      message: task.state === 'approval' ? 'Return to Agent to approve' : task.state === 'completed' ? 'Complete' : task.state === 'waiting' ? '等待 Agent 事件' : '预估进度 · 以真实完成事件为准',
      error: task.state === 'failed' ? 'Agent 返回错误，请查看原任务' : undefined
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
  private last = ''
  private startedAt = Date.now()
  constructor(private listener: (event: ProgressEvent) => void,
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
  async poll(baseline = false): Promise<void> {
    const seen = new Set<string>()
    for (const [root, source] of this.roots) {
      for (const path of await this.files(root)) {
        seen.add(path)
        try {
          const info = await stat(path)
          let cursor = this.cursors.get(path)
          if (!cursor) {
            cursor = { offset: baseline || info.mtimeMs < this.startedAt ? info.size : 0,
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
                  const signal = parseSignal(source, row)
                  if (signal) this.tracker.accept(path, source, signal)
                }
              } catch { /* partial/malformed record is not a lifecycle event */ }
              from = end + 1
            }
            cursor.pending = data.subarray(from)
          } finally { await handle.close() }
        } catch { /* session may be removed while scanning */ }
      }
    }
    for (const path of this.cursors.keys()) if (!seen.has(path)) this.cursors.delete(path)
    await this.readHooks()
    const snapshot = this.tracker.snapshot()
    const serialized = JSON.stringify(snapshot)
    if (snapshot && serialized !== this.last) { this.last = serialized; this.listener(snapshot) }
  }
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
          this.tracker.hook(row.path, row.source, {kind:row.kind,id:row.id,requestId:row.requestId})
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
