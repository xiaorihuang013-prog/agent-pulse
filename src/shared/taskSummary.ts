import type { Lang } from './i18n'

// Paired, concise summaries: the same task keeps its meaning when language changes.
const summaries = [
  ['Update Card Task Titles', '修改卡片任务标题', /标题|titles?/i],
  ['Fix Widget Expansion', '修复组件展开收起', /悬停展开|自动展开|自动收起|紧缩|收起|hover.*expand|collaps|widget expansion/i],
  ['Update Approval Alerts', '修改批准提醒', /批准|approval/i],
  ['Restart Agent Pulse', '重启组件', /重启.*组件|重启.*pulse|restart.*(?:widget|pulse)/i],
  ['Update Interface Languages', '统一界面语言', /中英文|全英|英文版|中文版|语言|localiz|translation.*ui|interface languages/i],
  ['Sync Git Repository', '同步 Git 仓库', /上传.*git|推送|同步.*git|git.*(?:push|sync)|push.*git|sync.*repository/i],
  ['Troubleshoot Agent Login', '排查 Agent 登录', /登录|掉线|login|log in|authentication/i],
  ['Generate Market Report', '生成市场报告', /(?:市场|market)[\s\S]*?(?:报告|report)|(?:报告|report)[\s\S]*?(?:市场|market)/i],
  ['Generate Report', '生成报告', /报告|report/i],
  ['Fetch Market Information', '抓取市场信息', /(?:抓取|爬取|采集|fetch|scrap|collect)[\s\S]*?(?:市场|market)/i],
  ['Fetch Information', '抓取信息', /抓取|爬取|采集|fetch|scrap|crawl|collect/i],
  ['Translate Content', '翻译内容', /翻译|translate|translation/i],
  ['Summarize Information', '总结信息', /总结|摘要|summari[sz]|summary/i],
  ['Resize Widget Card', '调整卡片尺寸', /尺寸|大小|缩小|放大|resize|card size/i],
  ['Fix Issues', '修复问题', /修复|报错|bug|debug|\bfix\b/i],
  ['Refine Interface', '优化界面', /优化|改善|调整|界面|按钮|样式|布局|interface|\bui\b|layout|styling|hover/i],
  ['Run Checks', '运行检查', /测试|检查|test|verify|checks/i],
  ['Analyze Market', '分析市场', /(?:分析|研究|analy[sz]|research)[\s\S]*?(?:市场|market)/i],
  ['Research Information', '调研信息', /分析|研究|调研|analy[sz]|research/i],
  ['Develop Plugin', '开发插件', /插件|plugin/i],
  ['Build Website', '构建网站', /网站|网页|website|webpage/i],
  ['Create Image', '创建图片', /图片|图像|image/i],
  ['Prepare Document', '准备文档', /文档|document/i],
  ['Implement Changes', '实现改动', /代码|功能|修改|implement|code|feature|update|change/i],
  ['Agent Task', '代理任务', /./]
] as const

// Keep old summaries as aliases for cached tasks; display only compact labels.
const shortTitles: Record<string, readonly [string, string]> = {
  'Update Card Task Titles': ['Update Titles', '修改标题'],
  'Fix Widget Expansion': ['Fix Expansion', '修复展开'],
  'Update Approval Alerts': ['Approval Alerts', '批准提醒'],
  'Restart Agent Pulse': ['Restart Widget', '重启组件'],
  'Update Interface Languages': ['Update Language', '调整语言'],
  'Sync Git Repository': ['Sync Git', '同步代码'],
  'Troubleshoot Agent Login': ['Fix Login', '排查登录'],
  'Generate Market Report': ['Market Report', '市场报告'],
  'Generate Report': ['Create Report', '生成报告'],
  'Fetch Market Information': ['Fetch Markets', '抓取行情'],
  'Fetch Information': ['Fetch Data', '抓取信息'],
  'Translate Content': ['Translate', '翻译内容'],
  'Summarize Information': ['Summarize', '总结信息'],
  'Resize Widget Card': ['Resize Card', '调整尺寸'],
  'Research Information': ['Research', '调研信息'],
  'Prepare Document': ['Create Document', '创建文档'],
  'Implement Changes': ['Update Code', '修改代码']
}

/** Local summarization without uploading prompts or adding an API dependency. */
export function summarizeTaskTitle(prompt: string, lang: Lang = 'en'): string {
  let request = prompt.split(/(?:## My request:|<user_request>)/i).at(-1) ?? prompt
  request = request.replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
  // Resolve known summaries first; never reclassify them by a broader keyword.
  const exact = summaries.find(([en, zh]) =>
    request === en || request === zh || shortTitles[en]?.includes(request))
  const match = exact ?? summaries.find(([, , pattern]) => pattern.test(request)) ?? summaries[summaries.length - 1]
  return (shortTitles[match[0]] ?? match)[lang === 'zh' ? 1 : 0]
}
