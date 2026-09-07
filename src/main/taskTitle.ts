/** Local, deterministic English labels; no prompt text is sent to another model. */
export function taskTitleFromPrompt(prompt: string): string {
  const request = prompt.split(/(?:## My request:|<user_request>)/i).at(-1) ?? prompt
  const text = request.replace(/<[^>]*>[\s\S]*?<\/[^>]*>/g, ' ').slice(0, 8000).toLowerCase()
  const market = /市场|行情|market/.test(text)
  if (/报告|report/.test(text)) return market ? 'Generate Market Report' : 'Generate Report'
  if (/抓取|爬取|采集|scrap|crawl|fetch|collect/.test(text)) return market ? 'Fetch Market Information' : 'Fetch Information'
  if (/翻译|translate|translation/.test(text)) return 'Translate Content'
  if (/总结|摘要|summari[sz]|summary/.test(text)) return 'Summarize Information'
  if (/修复|报错|bug|debug|\bfix\b/.test(text)) return 'Fix Issues'
  if (/优化|改善|调整|界面|按钮|样式|布局|ui\b|layout|styling|hover/.test(text)) return 'Refine Interface'
  if (/测试|test|verify/.test(text)) return 'Run Checks'
  if (/分析|研究|调研|analy[sz]|research/.test(text)) return market ? 'Analyze Market' : 'Research Information'
  if (/插件|plugin/.test(text)) return 'Develop Plugin'
  if (/网站|网页|website|webpage/.test(text)) return 'Build Website'
  if (/图片|图像|image/.test(text)) return 'Create Image'
  if (/文档|document/.test(text)) return 'Prepare Document'
  if (/代码|功能|implement|code|feature/.test(text)) return 'Implement Changes'
  return 'Agent Task'
}

export function promptText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter(block => block && ['text', 'input_text'].includes(block.type))
    .map(block => typeof block.text === 'string' ? block.text : '').join('\n')
}
