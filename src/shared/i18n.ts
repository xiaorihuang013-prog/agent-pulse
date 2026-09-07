// Shared bilingual strings (English default + Simplified Chinese), used by both
// main (tray menu) and renderer (widget / detail window). The language toggle
// lives only in the tray menu — the widget itself never exposes a language switch.

export type Lang = 'en' | 'zh'

const en = {
  // widget state views
  complete: 'Complete',
  approval: 'Approval',
  approvalHint: 'Return to {agent}\nto approve',
  failed: 'Failed',
  unknownError: 'Unknown error',
  paused: 'Paused',
  queued: 'Queued',
  stopped: 'Stopped',
  agentTask: 'Agent Task',
  estimated: 'est · ',
  // detail window
  idle: 'Idle',
  hideToWidget: 'Hide to Widget',
  appearance: 'Appearance',
  appearanceAuto: 'Auto',
  appearanceDark: 'Dark',
  appearanceLight: 'Light',
  metricPercent: 'Progress',
  metricElapsed: 'Elapsed',
  metricEta: 'Remaining',
  // tray menu
  showHideWidget: 'Show / Hide Widget',
  openMain: 'Open Main Window',
  runDemo: 'Run Demo Task',
  pause: 'Pause',
  resume: 'Resume',
  cancel: 'Cancel',
  simulateFailure: 'Simulate Failure',
  sound: 'Sound',
  notifications: 'Notifications',
  language: 'Language',
  quit: 'Quit',
  // notifications
  notifyCompleteTitle: 'Task complete',
  notifyCompleteBody: '{title} finished',
  notifyFailedTitle: 'Task failed',
  notifyFailedBody: '{title} failed',
  notifyApprovalTitle: 'Approval needed',
  notifyApprovalBody: 'Return to {agent} to approve',
  // agent monitor (main process) emitted task data
  stage0: 'Understanding',
  stage1: 'Gathering',
  stage2: 'Working',
  stage3: 'Reviewing',
  act0: 'Understanding the request…',
  act1: 'Gathering information…',
  act2: 'Working on the task…',
  act3: 'Reviewing results…',
  msgApproval: 'Return to Agent to approve',
  msgWaiting: 'Waiting for Agent event',
  msgError: 'Agent returned an error — check the original task',
  tasksRunning: ' · {n} tasks running'
} as const

export type I18nKey = keyof typeof en

const zh: Record<I18nKey, string> = {
  complete: '完成',
  approval: '待批准',
  approvalHint: '返回 {agent}\n进行批准',
  failed: '失败',
  unknownError: '未知错误',
  paused: '已暂停',
  queued: '排队中',
  stopped: '已停止',
  agentTask: '代理任务',
  estimated: '预估 · ',
  idle: '空闲',
  hideToWidget: '隐藏到组件',
  appearance: '外观',
  appearanceAuto: '自动',
  appearanceDark: '深色',
  appearanceLight: '浅色',
  metricPercent: '进度',
  metricElapsed: '已耗时',
  metricEta: '剩余',
  showHideWidget: '显示 / 隐藏组件',
  openMain: '打开详情窗口',
  runDemo: '运行演示任务',
  pause: '暂停',
  resume: '继续',
  cancel: '取消',
  simulateFailure: '模拟失败',
  sound: '声音',
  notifications: '通知',
  language: '语言',
  quit: '退出',
  notifyCompleteTitle: '任务完成',
  notifyCompleteBody: '{title} 已完成',
  notifyFailedTitle: '任务失败',
  notifyFailedBody: '{title} 失败',
  notifyApprovalTitle: '需要批准',
  notifyApprovalBody: '返回 {agent} 进行批准',
  stage0: '理解任务',
  stage1: '收集信息',
  stage2: '执行任务',
  stage3: '检查结果',
  act0: '理解请求…',
  act1: '收集信息…',
  act2: '执行任务…',
  act3: '检查结果…',
  msgApproval: '返回 Agent 进行批准',
  msgWaiting: '等待 Agent 事件',
  msgError: 'Agent 返回错误，请查看原任务',
  tasksRunning: ' · {n} 个任务运行中'
}

export const STRINGS: Record<Lang, Record<I18nKey, string>> = { en, zh }

export const DEFAULT_LANG: Lang = 'en'

/** Look up a string, falling back to English. `vars` interpolates `{key}` placeholders. */
export function t(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[lang]?.[key] ?? en[key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}

const STATE_ZH: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  paused: '已暂停',
  waiting: '等待中',
  approval: '待批准',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
}

/** Localize a TaskState enum value for display; English keeps the raw value. */
export function stateLabel(lang: Lang, state: string): string {
  return lang === 'zh' ? (STATE_ZH[state] ?? state) : state
}
