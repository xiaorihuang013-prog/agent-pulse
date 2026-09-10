import { summarizeTaskTitle } from './taskSummary'
import { STRINGS, t } from './i18n'
import type { Lang, I18nKey } from './i18n'
import type { ProgressEvent } from './types'

const LEGACY_TITLES: Record<string, string> = {
  'Generate Market Report': '生成市场报告',
  'Generate Report': '生成报告',
  'Fetch Market Information': '抓取市场信息',
  'Fetch Information': '抓取信息',
  'Translate Content': '翻译内容',
  'Summarize Information': '总结信息',
  'Fix Issues': '修复问题',
  'Refine Interface': '优化界面',
  'Run Checks': '运行检查',
  'Analyze Market': '分析市场',
  'Research Information': '调研信息',
  'Develop Plugin': '开发插件',
  'Build Website': '构建网站',
  'Create Image': '创建图片',
  'Prepare Document': '准备文档',
  'Implement Changes': '实现改动',
  'Agent Task': '代理任务',
  'Research & draft market analysis': '调研并起草市场分析',
  'Research': '调研',
  'Collection': '收集',
  'Analysis': '分析',
  'Writing': '写作',
  'Review': '审查',
  'Scanning reference sources…': '正在扫描参考来源…',
  'Fetching documents…': '正在获取文档…',
  'Thinking…': '正在思考…',
  'Drafting output…': '正在起草输出…',
  'Verifying result…': '正在核验结果…',
  'Waiting for remote service…': '等待远程服务…',
  'Analysis pipeline crashed — model unavailable.': '分析流水线崩溃 — 模型不可用。',
  'Queued…': '排队中…',
  'Cancelled': '已取消',
  'Done': '完成',
  'Working…': '工作中…'
}

// Translate only app-owned labels. User prose and tool operands are not UI strings.
export function localizeProgressText(value: string, lang: Lang): string {
  for (const key of Object.keys(STRINGS.en) as I18nKey[]) {
    if (value === STRINGS.en[key] || value === STRINGS.zh[key]) return t(lang, key)
  }
  for (const [en, zh] of Object.entries(LEGACY_TITLES)) {
    if (value === en || value === zh) return lang === 'en' ? en : zh
  }
  const verbs: I18nKey[] = ['actEditNotebook', 'actRead', 'actEdit', 'actWrite', 'actSearch', 'actFetch', 'actSkill']
  for (const key of verbs) {
    for (const source of ['en', 'zh'] as const) {
      const prefix = `${STRINGS[source][key]} `
      if (value.startsWith(prefix)) return `${t(lang, key)} ${value.slice(prefix.length)}`
    }
  }
  return value
}

/** Resolve cached event text at render time, so language changes apply immediately. */
export function localizeProgress(event: ProgressEvent | null, lang: Lang): ProgressEvent | null {
  if (!event) return null
  return {
    ...event,
    title: event.titleFromAi ? event.title : summarizeTaskTitle(event.title, lang),
    stage: localizeProgressText(event.stage, lang),
    message: localizeProgressText(event.message, lang),
    activity: event.activity === undefined ? undefined : localizeProgressText(event.activity, lang),
    error: event.error === undefined ? undefined : localizeProgressText(event.error, lang)
  }
}
