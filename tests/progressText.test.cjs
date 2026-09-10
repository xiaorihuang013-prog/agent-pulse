const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, filename)
const { localizeProgress, localizeProgressText } = require('../src/shared/progressText.ts')

test('cached task labels and stages follow language switches in both directions', () => {
  const raw = { title: '修复问题', stage: '执行任务', message: '执行任务…', activity: '编辑 index.ts', state: 'running', progress: .5 }
  const en = localizeProgress(raw, 'en')
  assert.equal(en.title, 'Fix Issues')
  assert.equal(en.stage, 'Working')
  assert.equal(en.message, 'Working on the task…')
  assert.equal(en.activity, 'Edit index.ts')
  const zh = localizeProgress(en, 'zh')
  assert.equal(zh.title, raw.title)
  assert.equal(zh.activity, raw.activity)
  assert.equal(raw.title, '修复问题')
  assert.equal(localizeProgress(raw, 'en').progress, .5)
})
test('language changes also cover terminal events and demo messages', () => {
  assert.equal(localizeProgressText('返回 Agent 进行批准', 'en'), 'Return to Agent to approve')
  assert.equal(localizeProgressText('Unknown error', 'zh'), '未知错误')
  assert.equal(localizeProgressText('正在核验结果…', 'en'), 'Verifying result…')
  assert.equal(localizeProgress(null, 'zh'), null)
})
test('actual task prose and tool operands are preserved', () => {
  assert.equal(localizeProgressText('修复问题：保存设置后崩溃', 'en'), '修复问题：保存设置后崩溃')
  assert.equal(localizeProgressText('Read 中文文件.ts', 'zh'), '读取 中文文件.ts')
  assert.equal(localizeProgressText('Bash: npm test', 'zh'), 'Bash: npm test')
})

const { summarizeTaskTitle } = require('../src/shared/taskSummary.ts')
test('task summaries are concise, bilingual and stable across language changes', () => {
  const prompt = 'agent pulse展开页和详情页的任务标题，目前是直接展示我的prompt，改成你自己总结的阶段任务标题，中英文各自适配，英文版必须全英'
  assert.equal(summarizeTaskTitle(prompt, 'zh'), '修改标题')
  assert.equal(summarizeTaskTitle(prompt, 'en'), 'Update Titles')
  assert.equal(summarizeTaskTitle('修改卡片任务标题', 'en'), 'Update Titles')
  assert.equal(summarizeTaskTitle('Update Card Task Titles', 'zh'), '修改标题')
  for (const title of ['中文未知请求', '生成市场报告', '请修复悬停展开后无法收起', '上传当前版本到git']) {
    const en = summarizeTaskTitle(title, 'en')
    assert.match(en, /^[A-Za-z ]+$/)
    assert.ok(en.length < 40)
  }
  const raw = {title: prompt, stage: 'Working', message: ''}
  const en = localizeProgress(raw, 'en')
  assert.equal(en.title, 'Update Titles')
  assert.equal(localizeProgress(en, 'zh').title, '修改标题')
  assert.equal(raw.title, prompt)
})

test('ai-title is displayed verbatim across language switches', () => {
  const raw = { title: '抓取LinkedIn职位信息', titleFromAi: true, stage: 'Working', message: '', progress: .5 }
  assert.equal(localizeProgress(raw, 'zh').title, '抓取LinkedIn职位信息')
  assert.equal(localizeProgress(raw, 'en').title, '抓取LinkedIn职位信息')
})
