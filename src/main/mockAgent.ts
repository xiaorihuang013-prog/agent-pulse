import type { ProgressEvent, Stage, TaskState } from '../shared/types'
import type { Lang } from '../shared/i18n'
import { getLanguage } from './settings'

const TASK_TITLE: Record<Lang, string> = {
  en: 'Research & draft market analysis',
  zh: '调研并起草市场分析'
}

const STAGES: Stage[] = [
  { key: 'research', label: 'Research', weight: 0.2 },
  { key: 'collection', label: 'Collection', weight: 0.25 },
  { key: 'analysis', label: 'Analysis', weight: 0.25 },
  { key: 'writing', label: 'Writing', weight: 0.2 },
  { key: 'review', label: 'Review', weight: 0.1 }
]

const STAGE_LABELS: Record<string, Record<Lang, string>> = {
  research: { en: 'Research', zh: '调研' },
  collection: { en: 'Collection', zh: '收集' },
  analysis: { en: 'Analysis', zh: '分析' },
  writing: { en: 'Writing', zh: '写作' },
  review: { en: 'Review', zh: '审查' }
}

const STAGE_MESSAGES: Record<string, Record<Lang, string>> = {
  research: { en: 'Scanning reference sources…', zh: '正在扫描参考来源…' },
  collection: { en: 'Fetching documents…', zh: '正在获取文档…' },
  analysis: { en: 'Thinking…', zh: '正在思考…' },
  writing: { en: 'Drafting output…', zh: '正在起草输出…' },
  review: { en: 'Verifying result…', zh: '正在核验结果…' }
}

const WAITING_MESSAGE: Record<Lang, string> = {
  en: 'Waiting for remote service…',
  zh: '等待远程服务…'
}

const ERROR_MESSAGE: Record<Lang, string> = {
  en: 'Analysis pipeline crashed — model unavailable.',
  zh: '分析流水线崩溃 — 模型不可用。'
}

const STATE_MESSAGES: Record<Lang, Record<string, string>> = {
  en: { queued: 'Queued…', paused: 'Paused', cancelled: 'Cancelled', completed: 'Done', running: 'Working…' },
  zh: { queued: '排队中…', paused: '已暂停', cancelled: '已取消', completed: '完成', running: '工作中…' }
}

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
    this.error = ERROR_MESSAGE.en
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

  private messageFor(lang: Lang): string {
    switch (this.state) {
      case 'queued':
        return STATE_MESSAGES[lang].queued
      case 'paused':
        return STATE_MESSAGES[lang].paused
      case 'waiting':
        return WAITING_MESSAGE[lang]
      case 'cancelled':
        return STATE_MESSAGES[lang].cancelled
      case 'failed':
        return ERROR_MESSAGE[lang]
      case 'completed':
        return STATE_MESSAGES[lang].completed
      case 'running': {
        const key = STAGES[this.stageIndex]?.key
        return key ? (STAGE_MESSAGES[key]?.[lang] ?? STATE_MESSAGES[lang].running) : STATE_MESSAGES[lang].running
      }
      default:
        return ''
    }
  }

  private emit(): void {
    if (!this.listener) return
    const lang = getLanguage()
    const stage = STAGES[Math.min(this.stageIndex, STAGES.length - 1)]
    const e: ProgressEvent = {
      title: TASK_TITLE[lang],
      state: this.state,
      progress: this.currentProgress(),
      stage: STAGE_LABELS[stage.key]?.[lang] ?? stage.label,
      stageIndex: this.stageIndex,
      etaSeconds: this.currentEta(),
      message: this.messageFor(lang),
      error: this.error ? ERROR_MESSAGE[lang] : undefined,
      startedAt: this.runStart
    }
    this.listener(e)
  }
}
