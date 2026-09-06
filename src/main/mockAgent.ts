import type { ProgressEvent, Stage, TaskState } from '../shared/types'

const TASK_TITLE = 'Research & draft market analysis'

// Stage weights — the progress percentage is derived from these, never guessed.
const STAGES: Stage[] = [
  { key: 'research', label: 'Research', weight: 0.2 },
  { key: 'collection', label: 'Collection', weight: 0.25 },
  { key: 'analysis', label: 'Analysis', weight: 0.25 },
  { key: 'writing', label: 'Writing', weight: 0.2 },
  { key: 'review', label: 'Review', weight: 0.1 }
]

const MESSAGES: Record<string, string> = {
  research: 'Scanning reference sources…',
  collection: 'Fetching documents…',
  analysis: 'Thinking…',
  writing: 'Drafting output…',
  review: 'Verifying result…'
}

const WAITING_MESSAGE = 'Waiting for remote service…'

type Listener = (e: ProgressEvent) => void

/** Mock agent: advances through weighted stages over real time and emits progress events. */
export class MockAgent {
  private timer: ReturnType<typeof setInterval> | null = null
  private listener: Listener | null = null
  private state: TaskState = 'queued'
  private stageIndex = 0
  private stageStart = 0
  private stageEnd = 0
  private runStart = 0
  private totalMs = 20000
  private waitingUntil = 0
  private error: string | undefined

  onProgress(cb: Listener): void {
    this.listener = cb
  }

  start(): void {
    this.stopTimer()
    this.state = 'running'
    this.stageIndex = 0
    this.totalMs = 18000 + Math.random() * 12000 // 18–30s demo run
    this.runStart = Date.now()
    this.stageStart = this.runStart
    this.stageEnd = this.stageStart + this.stageDuration(0)
    this.waitingUntil = 0
    this.error = undefined
    this.emit()
    this.timer = setInterval(() => this.tick(), 250)
  }

  pause(): void {
    if (this.state !== 'running' && this.state !== 'waiting') return
    this.state = 'paused'
    this.stopTimer()
    this.emit()
  }

  resume(): void {
    if (this.state !== 'paused') return
    const remaining = Math.max(0, this.stageEnd - Date.now())
    this.state = 'running'
    this.stageStart = Date.now()
    this.stageEnd = this.stageStart + remaining
    this.emit()
    this.timer = setInterval(() => this.tick(), 250)
  }

  cancel(): void {
    this.state = 'cancelled'
    this.stopTimer()
    this.emit()
  }

  fail(): void {
    this.state = 'failed'
    this.error = 'Analysis pipeline crashed — model unavailable.'
    this.stopTimer()
    this.emit()
  }

  private tick(): void {
    const now = Date.now()

    if (this.state === 'waiting') {
      if (now >= this.waitingUntil) {
        this.state = 'running'
        this.stageStart = now
        this.stageEnd = now + this.stageDuration(this.stageIndex)
      } else {
        this.emit()
        return
      }
    }

    if (now >= this.stageEnd) {
      this.stageIndex++
      if (this.stageIndex >= STAGES.length) {
        this.complete()
        return
      }
      this.stageStart = this.stageEnd
      this.stageEnd = this.stageStart + this.stageDuration(this.stageIndex)
    }

    // Inject a brief "waiting" phase partway through Collection to exercise that state.
    if (this.state === 'running' && this.stageIndex === 1 && this.waitingUntil === 0 && this.fraction() > 0.35) {
      this.waitingUntil = now + 1800
      this.state = 'waiting'
      this.emit()
      return
    }

    this.emit()
  }

  private complete(): void {
    this.state = 'completed'
    this.stopTimer()
    this.emit()
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private stageDuration(i: number): number {
    const jitter = 0.85 + Math.random() * 0.3
    return STAGES[i].weight * this.totalMs * jitter
  }

  private fraction(): number {
    if (this.stageEnd <= this.stageStart) return 1
    const f = (Date.now() - this.stageStart) / (this.stageEnd - this.stageStart)
    return Math.min(1, Math.max(0, f))
  }

  private currentProgress(): number {
    if (this.state === 'completed') return 1
    let p = 0
    for (let i = 0; i < this.stageIndex && i < STAGES.length; i++) p += STAGES[i].weight
    if (this.stageIndex < STAGES.length) p += this.fraction() * STAGES[this.stageIndex].weight
    return Math.min(1, Math.max(0, p))
  }

  private currentEta(): number | null {
    if (this.state !== 'running' && this.state !== 'waiting') return null
    const p = this.currentProgress()
    if (p <= 0.001) return null
    const elapsed = Date.now() - this.runStart
    return Math.max(0, Math.round((elapsed / p) * (1 - p) / 1000))
  }

  private messageFor(): string {
    switch (this.state) {
      case 'queued':
        return 'Queued…'
      case 'paused':
        return 'Paused'
      case 'waiting':
        return WAITING_MESSAGE
      case 'cancelled':
        return 'Cancelled'
      case 'failed':
        return this.error ?? 'Failed'
      case 'completed':
        return 'Done'
      case 'running':
        return MESSAGES[STAGES[this.stageIndex]?.key] ?? 'Working…'
      default:
        return ''
    }
  }

  private emit(): void {
    if (!this.listener) return
    const stage = STAGES[Math.min(this.stageIndex, STAGES.length - 1)]
    const e: ProgressEvent = {
      title: TASK_TITLE,
      state: this.state,
      progress: this.currentProgress(),
      stage: stage.label,
      stageIndex: this.stageIndex,
      etaSeconds: this.currentEta(),
      message: this.messageFor(),
      error: this.error
    }
    this.listener(e)
  }
}
