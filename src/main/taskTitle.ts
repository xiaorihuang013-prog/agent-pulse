import type { Lang } from '../shared/i18n'

const TITLE_ZH: Record<string, string> = {
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
  'Agent Task': '代理任务'
}

/** Local, deterministic labels; no prompt text is sent to another model. */
export function taskTitleFromPrompt(prompt: string, lang: Lang = 'en'): string {
  const request = prompt.split(/(?:## My request:|<user_request>)/i).at(-1) ?? prompt
  const text = request.replace(/<[^>]*>[\s\S]*?<\/[^>]*>/g, ' ').slice(0, 8000).toLowerCase()
  const market = /市场|行情|market/.test(text)
  let title: string
  if (/报告|report/.test(text)) title = market ? 'Generate Market Report' : 'Generate Report'
  else if (/抓取|爬取|采集|scrap|crawl|fetch|collect/.test(text)) title = market ? 'Fetch Market Information' : 'Fetch Information'
  else if (/翻译|translate|translation/.test(text)) title = 'Translate Content'
  else if (/总结|摘要|summari[sz]|summary/.test(text)) title = 'Summarize Information'
  else if (/修复|报错|bug|debug|\bfix\b/.test(text)) title = 'Fix Issues'
  else if (/优化|改善|调整|界面|按钮|样式|布局|ui\b|layout|styling|hover/.test(text)) title = 'Refine Interface'
  else if (/测试|test|verify/.test(text)) title = 'Run Checks'
  else if (/分析|研究|调研|analy[sz]|research/.test(text)) title = market ? 'Analyze Market' : 'Research Information'
  else if (/插件|plugin/.test(text)) title = 'Develop Plugin'
  else if (/网站|网页|website|webpage/.test(text)) title = 'Build Website'
  else if (/图片|图像|image/.test(text)) title = 'Create Image'
  else if (/文档|document/.test(text)) title = 'Prepare Document'
  else if (/代码|功能|implement|code|feature/.test(text)) title = 'Implement Changes'
  else title = 'Agent Task'
  return lang === 'zh' ? (TITLE_ZH[title] ?? title) : title
}

export function promptText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter(block => block && ['text', 'input_text'].includes(block.type))
    .map(block => typeof block.text === 'string' ? block.text : '').join('\n')
}
