# 维护索引

按改动范围查找引用，避免依赖易过时的行号。

| 范围 | 入口 |
|---|---|
| 共享契约、尺寸、语言、标题、主题 | `src/shared/` |
| 日志解析、任务追踪、增量轮询 | `src/main/agentMonitor.ts` |
| 手动演示、设置持久化 | `src/main/mockAgent.ts`、`settings.ts` |
| 窗口、菜单栏、打开 Agent | `src/main/windows.ts`、`tray.ts`、`openAgent.ts` |
| 跨进程接口 | `src/shared/api.ts` → `src/preload/index.ts` → `src/main/ipc.ts`、`index.ts` |
| 卡片、详情、样式 | `src/renderer/src/components/`、`styles/index.css` |
| 展开收起、拖拽、计时、外观 | `src/renderer/src/hooks/` |
| 音效、主题变量、时间格式 | `src/renderer/src/lib/` |
| 自启、hooks 安装及通知 | `scripts/install-*.cjs`、`agent-notify.py` |

验证：`npm test` 检查解析、状态、标题、应用路由；`npm run build` 包含类型与未使用代码检查；`npm run test:ui` 检查尺寸、详情按钮、音效、展开收起与卡片点击。窗口验证需要 macOS 图形会话，测试不实际打开 Agent。

维护约束：完成态保持到明确新任务开始；普通工具活动不能冒充开始或完成；批准提醒不代替批准决定；更改共享字段时同步主进程、preload 和渲染层。
