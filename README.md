# Agent Pulse

一个「操作系统级」的桌面 Agent 进度悬浮 Widget。向 AI Agent 提交长任务后，可以隐藏主窗口，Agent 在后台继续执行，桌面保留一个轻量、始终置顶的悬浮组件实时显示状态与进度；任务到达 100% 时播放完成动画 + 提示音，点击可重新打开主窗口。

视觉目标：像高端硬件 / 系统组件，而不是网页进度条 —— 近黑表面、细线、点阵数字、单一 Acid Lime accent、少量 glow/blur。

## 技术栈

- Electron + electron-vite（主进程 / preload / renderer 三段式）
- React 19 + TypeScript
- Vite 7
- 无状态库、无 UI 库、无 electron-store（设置用 `userData` 下 JSON 手写模块）
- 完成提示音用 Web Audio API 合成（无音频资源文件）

## 安装

```bash
npm install
```

## 启动（开发）

```bash
npm run dev
```

启动后会自动跑一个 Mock 任务（18–30s 完成），桌面右上角出现悬浮 Widget，同时出现系统托盘图标。

## 构建

```bash
npm run build      # typecheck + electron-vite build（产物在 out/）
npm run typecheck  # 仅类型检查
npm run preview    # 预览构建产物
```

## 交互

| 操作 | 行为 |
| --- | --- |
| 悬停 Widget | Compact → Expanded（展开标题 / 进度条 / 阶段 / ETA / 执行信息） |
| 点击 Widget | 打开 Agent 主窗口（Widget 自动隐藏） |
| 拖拽 Widget | 移动位置（松开后记住位置） |
| 主窗口最小化 / 关闭 | Widget 重新显示 |
| 托盘「Sound」 | 开关完成提示音 |
| 托盘 Start / Pause / Resume / Cancel / Simulate Failure | 演示各任务状态 |

## Widget 状态

- **Compact**：默认，只显示点阵数字进度（如 `72%`）
- **Expanded**：悬停展开，显示 Task Title / Progress / 细线进度条 / Stage / ETA / 执行信息
- **Completed**：`✓ Complete 100%` + accent glow 动画 + 提示音，保持几秒后回到 Compact
- **Failed**：`⚠ Failed` + 简短错误信息

## 进度机制（Stage Weight）

百分比由主进程 `mockAgent` 按阶段权重真实推进，**不猜百分比**：

```
Research 20% · Collection 25% · Analysis 25% · Writing 20% · Review 10%
```

`progress = Σ(已完成阶段权重) + 当前阶段内完成比例 × 当前阶段权重`

## 主题系统

首版实现 **Monochrome Lime**（Acid Yellow / Lime），主题 token 全部通过 CSS 变量下发。新增主题只需在 `src/shared/theme.ts` 的 `themes` 注册表里加一个 `ThemeTokens` 对象（未来 Purple / Blue / Amber / Custom），UI 零改动。

## 目录结构

```
src/
├── shared/       # 类型、主题 token、窗口尺寸（主进程与 renderer 共享）
├── main/         # Electron 主进程：窗口 / 托盘 / Mock Agent / IPC / 设置持久化
├── preload/      # contextBridge，暴露 window.agentPulse
└── renderer/     # React Widget UI：点阵数字、细线进度条、状态机、拖拽、声音
```

## 性能

- 进度数字只在**整数百分比变化时**触发 React setState（一次任务 ≤ 100 次重渲染）
- 细线进度条用 `ref` 直接改 `transform: scaleX()`，**零 React 重渲染**
- 所有动画只用 `transform` / `opacity`（GPU 合成），配 CSS keyframes + `requestAnimationFrame`
- 任务完成后 rAF 循环停转，空闲 CPU 接近 0
