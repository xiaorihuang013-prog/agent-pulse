const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, filename)
const { parseSignal, TaskTracker, AgentMonitor } = require('../src/main/agentMonitor.ts')

test('Codex starts and completes only on explicit lifecycle events', () => {
  assert.equal(parseSignal('Codex', { type: 'event_msg', payload: { type: 'agent_message' } }), null)
  assert.deepEqual(parseSignal('Codex', { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'a' } }), {kind:'complete',id:'a'})
  assert.equal(parseSignal('Codex', { type: 'event_msg', payload: { type: 'turn_aborted' } }).kind, 'cancel')
})
test('Claude tool responses and subagents never start a user task', () => {
  assert.equal(parseSignal('Claude Code', {type:'user',isSidechain:true,message:{content:'hi'}}), null)
  assert.equal(parseSignal('Claude Code', {type:'user',message:{content:[{type:'tool_result'}]}}).kind, 'resume')
  assert.equal(parseSignal('Claude Code', {type:'assistant',message:{stop_reason:'tool_use',content:[]}}).kind, 'activity')
  assert.equal(parseSignal('Claude Code', {type:'assistant',message:{stop_reason:'end_turn'}}).kind, 'complete')
  assert.equal(parseSignal('Claude Code', {type:'assistant',isApiErrorMessage:true,message:{stop_reason:'end_turn'}}).kind, 'fail')
})
test('local CLI commands and compact bookkeeping never start a task', () => {
  assert.equal(parseSignal('Claude Code', {type:'user',uuid:'a',message:{content:'/compact'}}), null)
  assert.equal(parseSignal('Claude Code', {type:'user',uuid:'b',message:{content:'<command-name>/compact</command-name>'}}), null)
  assert.equal(parseSignal('Claude Code', {type:'user',uuid:'c',message:{content:'<local-command-stdout>Compacted</local-command-stdout>'}}), null)
  assert.equal(parseSignal('Claude Code', {type:'user',uuid:'d',isCompactSummary:true,message:{content:'This session is being continued…'}}), null)
  assert.equal(parseSignal('Claude Code', {type:'user',uuid:'e',message:{content:'执行任务'}}).kind, 'start')
})
test('terminal bundle resolves $TERM_PROGRAM and falls back to Terminal', () => {
  const { terminalBundle } = require('../src/main/openAgent.ts')
  assert.equal(terminalBundle('iTerm.app'), 'com.googlecode.iterm2')
  assert.equal(terminalBundle('vscode'), 'com.microsoft.VSCode')
  assert.equal(terminalBundle('Apple_Terminal'), 'com.apple.Terminal')
  assert.equal(terminalBundle('WarpTerminal'), 'dev.warp.Warp-Stable')
  assert.equal(terminalBundle('WezTerm'), 'org.wezfurlong.wezterm')
  assert.equal(terminalBundle('ghostty'), 'com.mitchellh.ghostty')
  assert.equal(terminalBundle(undefined), 'com.apple.Terminal')
  assert.equal(terminalBundle('unknown'), 'com.apple.Terminal')
})
test('estimated progress is monotonic, bounded, and never completes from elapsed time', () => {
  const t = new TaskTracker();t.accept('a','Codex',{kind:'start',id:'1'},0)
  let last=0
  for(let i=1;i<=50;i++) {
    t.accept('a','Codex',{kind:'activity',stage:i%4},i*1000)
    const s=t.snapshot(i*1000);assert.ok(s.progress>=last && s.progress<=.95);last=s.progress
  }
  assert.equal(t.snapshot(99999999).state,'waiting')
  t.accept('a','Codex',{kind:'complete',id:'wrong'},99999999)
  assert.notEqual(t.snapshot(99999999).state,'completed')
  t.accept('a','Codex',{kind:'complete',id:'1'},99999999)
  assert.equal(t.snapshot(99999999).progress,1)
  assert.equal(t.snapshot(999999999).state,'completed')
})
test('concurrent sessions do not declare all work complete early, and new tasks reset progress', () => {
  const t=new TaskTracker()
  t.accept('a','Codex',{kind:'start',id:'1'},10)
  t.accept('b','Claude Code',{kind:'start',id:'2'},20)
  t.accept('a','Codex',{kind:'complete',id:'1'},30)
  assert.equal(t.snapshot(30).taskId,'2')
  t.accept('b','Claude Code',{kind:'complete'},40)
  assert.equal(t.snapshot(40).state,'completed')
  t.accept('b','Claude Code',{kind:'start',id:'3'},50)
  assert.equal(t.snapshot(50).progress,.02)
})
test('incremental reader skips history, handles split UTF-8, discovers new files and freezes completion', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pulse-test-'));const file=path.join(dir,'session.jsonl')
  const row=(type,id='t')=>JSON.stringify({timestamp:new Date(Date.now()+100).toISOString(),type:'event_msg',payload:{type,turn_id:id}})+'\n'
  fs.writeFileSync(file,row('task_started','old')+row('task_complete','old'))
  const events=[];const m=new AgentMonitor(e=>events.push(e),[[dir,'Codex']],null)
  try {
    await m.poll(true);assert.equal(events.length,0)
    const b=Buffer.from(row('task_started'))
    fs.appendFileSync(file,b.subarray(0,19));await m.poll();assert.equal(events.length,0)
    fs.appendFileSync(file,b.subarray(19));await m.poll();assert.equal(events.at(-1).state,'running')
    fs.appendFileSync(file,row('task_complete'));await m.poll();assert.equal(events.at(-1).state,'completed')
    const n=events.length;await m.poll();assert.equal(events.length,n)
    fs.writeFileSync(path.join(dir,'new.jsonl'),row('task_started','new'));await m.poll();assert.equal(events.at(-1).taskId,'new')
  } finally { m.stop();fs.rmSync(dir,{recursive:true,force:true}) }
})

test('baseline backfills in-progress tasks and drops completed ones', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-backfill-'))
  const ts = (n) => new Date(Date.now() - 60000 + n).toISOString()
  const row = (type, id, extra = {}) => JSON.stringify({ timestamp: ts(1), type: 'event_msg', payload: { type, turn_id: id, ...extra } }) + '\n'
  fs.writeFileSync(path.join(dir, 'running.jsonl'), row('user_message', 't1', { message: '生成市场报告' }) + row('task_started', 't1'))
  fs.writeFileSync(path.join(dir, 'done.jsonl'), row('task_started', 't2') + row('task_complete', 't2'))
  const events = []
  const m = new AgentMonitor(e => events.push(e), [[dir, 'Codex']], null)
  try {
    await m.poll(true)
    assert.equal(events.length, 1)
    assert.equal(events[0].state, 'running')
    assert.equal(events[0].title, 'Generate Market Report')
    assert.equal(events[0].source, 'Codex')
  } finally { m.stop(); fs.rmSync(dir, { recursive: true, force: true }) }
})

test('English task titles follow the prompt and remain available after completion', () => {
  const {taskTitleFromPrompt}=require('../src/main/taskTitle.ts')
  assert.equal(taskTitleFromPrompt('帮我抓取某市场信息'),'Fetch Market Information')
  assert.equal(taskTitleFromPrompt('生成市场报告'),'Generate Market Report')
  assert.equal(taskTitleFromPrompt('优化按钮hover样式'),'Refine Interface')
  const t=new TaskTracker()
  t.accept('a','Codex',{kind:'start',id:'1'},0)
  t.accept('a','Codex',parseSignal('Codex',{type:'event_msg',payload:{type:'user_message',message:'生成市场报告'}}),1)
  t.accept('a','Codex',{kind:'complete',id:'1'},2)
  assert.equal(t.snapshot(2).title,'Generate Market Report')
  t.accept('a','Codex',{kind:'start',id:'2'},3)
  assert.equal(t.snapshot(3).title,'Agent Task')
  const s=parseSignal('Claude Code',{type:'user',uuid:'c',message:{content:[{type:'text',text:'抓取信息'}]}})
  assert.equal(s.title,'Fetch Information')
})

test('approval is explicit, frozen, deduplicated and resumes after approval', () => {
 const t=new TaskTracker();t.accept('a','Codex',{kind:'start',id:'1'},0)
 t.accept('a','Codex',{kind:'activity',stage:2},1000)
 const before=t.snapshot(1000).progress
 t.hook('a','Codex',{kind:'approval',id:'1',requestId:'tool'},2000)
 const notice=t.snapshot(2000).noticeId
 t.hook('a','Codex',{kind:'approval',id:'1',requestId:'tool'},3000)
 t.accept('a','Codex',{kind:'activity',stage:3},4000)
 assert.equal(t.snapshot(500000).state,'approval')
 assert.equal(t.snapshot(500000).noticeId,notice)
 assert.equal(t.snapshot(500000).progress,before)
 t.hook('a','Codex',{kind:'resume',id:'1'},500001)
 assert.equal(t.snapshot(500001).state,'running')
 t.hook('a','Codex',{kind:'approval',id:'1'},500002)
 assert.notEqual(t.snapshot(500002).noticeId,notice)
})
test('retryable errors and failed tools are not terminal task failures', () => {
 assert.equal(parseSignal('Codex',{type:'event_msg',payload:{type:'error',will_retry:true}}),null)
 assert.equal(parseSignal('Codex',{type:'event_msg',payload:{type:'error',will_retry:false}}).kind,'fail')
 const t=new TaskTracker();t.accept('a','Claude Code',{kind:'start',id:'1'},0)
 t.hook('a','Claude Code',{kind:'approval'},10)
 t.hook('a','Claude Code',{kind:'fail'},20)
 assert.equal(t.snapshot(30).state,'failed')
 assert.ok(t.snapshot(30).progress<1)
})
test('hook inbox delivers only fresh alerts and does not consume unrelated task state', async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pulse-hooks-'))
 const events=[],m=new AgentMonitor(e=>events.push(e),[],dir)
 try {
  fs.writeFileSync(path.join(dir,'old.json'),JSON.stringify({timestamp:0,source:'Codex',kind:'approval',path:'/old',id:'old'}))
  fs.writeFileSync(path.join(dir,'new.json'),JSON.stringify({timestamp:Date.now()+1,source:'Codex',kind:'approval',path:'/new',id:'new'}))
  await m.poll();assert.equal(events.at(-1).state,'approval');assert.equal(events.at(-1).taskId,'new')
  await m.poll();assert.equal(events.length,1)
 }finally{m.stop();fs.rmSync(dir,{recursive:true,force:true})}
})
