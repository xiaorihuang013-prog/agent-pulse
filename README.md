# Agent Pulse

macOS 菜单栏常驻的 Agent 任务进度组件，支持本机 **Claude Code 和 Codex（CLI / 写入本机会话日志的桌面任务）**。

## 自动激活

```sh
npm install
npm run background:install
```

这会构建并注册当前用户的 `com.eightsuns.agent-pulse` LaunchAgent，立即运行并在登录后自动启动。项目目录及 node_modules 需保留。更新后重新执行安装命令加载新版本。菜单栏 Quit 可退出当前运行；下次登录会重新启动。

- 空闲时仅显示 16 点白色菜单栏图标，不自动播放演示。
- 监听 `~/.codex/sessions` 和 `~/.claude/projects` 下新增的本地 JSONL 记录（也支持 CODEX_HOME / CLAUDE_CONFIG_DIR 环境变量）。不上传、不保存任务正文，不修改 Agent 配置。
- Codex 收到 `task_started`，或 Claude Code 写入用户提交消息时，自动显示数字卡片。
- 工具结果、子代理日志不作为新用户任务；启动时跳过已有历史，从启动后的新任务开始监听。
- Codex `task_complete` / Claude `end_turn` 才触发完成；取消与 API 错误不播放成功动画。
- 完成时提示音 + 发光对勾弹出 + Complete 淡入，之后定格，不回到 100%。
- 同时有多个任务时优先显示仍在运行的任务，标题标注数量；全部结束后显示最后结束任务的状态。
- 长时间没有新事件显示等待，不把无输出、Agent 崩溃或进程退出当成完成。

卸载后台启动：`npm run background:uninstall`。
开发：`npm run dev`；仅构建：`npm run build`；回归检查：`npm test`。
手动演示保留在菜单栏 Run Demo Task。

## 进度是估算值

通用 Agent 不提供可靠的“总工作量”。组件结合事件类型、工具活动次数及活跃耗时估算，展开画面明确标记“预估”。阶段权重为理解 10%、收集 20%、执行 50%、检查 15%，最后 5% 保留到真实完成事件。估算单调递增、运行中最多 95%，不使用计时器假装完成，不给出虚构的 ETA。

## 视觉与交互

所有窗口状态均为圆角正方形：普通 84×84，展开 200×200，完成 104×104，错误 200×200。中心纯黑，柔光和磨砂质感限制在内部边缘，无外部透明 padding 或发光扩展。点阵数字与百分号大小一致。菜单栏图标独立绘制 1x / 2x 白色版本，不做模糊处理。

悬停展开；拖拽移动；点击打开状态窗口；Sound 控制提示音。

## 兼容范围与限制

日志适配器已依据本机日志结构实现，这些文件不是稳定公共 API；升级 Agent 后若格式改变需更新适配器。仅支持此电脑上写入上述路径的会话；远程云端、无日志模式和其他 Agent 尚未接入。监听服务启动前已经进行中的任务不会追溯提示，以避免把旧历史误报为新任务。静默授权等待只能显示通用等待状态。

官方事件机制参考：[Codex Hooks](https://developers.openai.com/codex/hooks)、[Claude Code Hooks](https://code.claude.com/docs/en/hooks)。本版本使用本地日志适配，无需安装 hooks。


## 手动批准与失败提醒

执行 `node scripts/install-alert-hooks.cjs` 为 Codex / Claude Code 添加只通知、不批准也不拒绝的 hooks，既有 hooks 原样保留并备份。Codex 的新增 hooks 必须通过自身信任流程（CLI `/hooks`）审阅启用；Claude Code 建议在新会话中验证加载。

批准：琥珀色呼吸图标 + 三声提示，文字提示回到对应 Agent。进度暂停，重复事件不重复响铃。普通等待不触发批准提示。
失败：红色叉号轻晃 + 三音下降提示，随后定格。全局 Sound 开关同时控制成功、批准、失败音效。

Claude Code 使用 PermissionRequest / permission_prompt 通知，以及 StopFailure 失败通知；PostToolUse / Stop 清除批准等待。Codex 使用 PermissionRequest / PostToolUse / Stop / Interrupt，终止错误由 `error` 且 `will_retry: false` 的日志事件识别。单个工具失败、可重试错误不等于任务失败。Codex 版本若不写终止错误日志，则无法仅凭静默可靠识别失败。

通知队列只在本机保存事件类型与关联标识，不保存命令或任务正文。事件由后台组件读取后删除。动画与提示音可用 `scripts/verify-alerts.cjs` 做离屏验证。
