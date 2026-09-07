import { app, BrowserWindow, screen } from 'electron'
import type { Rectangle } from 'electron'
import { join } from 'path'
import { WIDGET_SIZES } from '../shared/layout'
import type { WidgetMode } from '../shared/layout'
import { resolveWidgetBounds, setWidgetBounds } from './settings'

let widget: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let quitting = false
app.on('before-quit', () => { quitting = true })

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function loadRenderer(win: BrowserWindow, hash?: string): void {
  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'] + (hash ? `#${hash}` : ''))
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }
}

function commonWebPreferences() {
  return {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true,
    nodeIntegration: false,
    autoplayPolicy: 'no-user-gesture-required' as const
  }
}

export function createWidgetWindow(): BrowserWindow {
  const { width, height } = WIDGET_SIZES.compact
  const bounds = resolveWidgetBounds(width, height)

  widget = new BrowserWindow({
    width,
    height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    webPreferences: commonWebPreferences()
  })

  widget.setAlwaysOnTop(true, 'floating')
  if (process.platform === 'darwin') {
    widget.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  // Stay hidden while the background monitor waits for a submitted task.
  widget.on('closed', () => {
    widget = null
  })

  loadRenderer(widget)
  return widget
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow) return mainWindow
  mainWindow = new BrowserWindow({
    width: 460,
    height: 320,
    show: false,
    frame: true,
    title: 'Agent Pulse',
    autoHideMenuBar: true,
    backgroundColor: '#0B0B0D',
    webPreferences: commonWebPreferences()
  })

  mainWindow.on('close', (e) => {
    if (quitting) return
    // Closing hides back to the widget rather than quitting the app.
    e.preventDefault()
    mainWindow?.hide()
    showWidget()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  loadRenderer(mainWindow, 'main')
  return mainWindow
}

export function getWidget(): BrowserWindow | null {
  return widget
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function showWidget(): void {
  widget?.show()
}

export function hideWidget(): void {
  widget?.hide()
}

export function toggleWidgetVisibility(): void {
  if (!widget) return
  if (widget.isVisible()) widget.hide()
  else widget.show()
}

/** Opening the main window hides the widget; minimizing/closing restores it. */
export function showMainWindow(): void {
  const win = createMainWindow()
  hideWidget()
  win.show()
  win.focus()
}

export function hideMainWindow(): void {
  mainWindow?.hide()
  showWidget()
}

/**
 * Keep the corner of the widget nearest the screen edge anchored while the size
 * changes, so expanding/collapsing never pushes the widget off-screen.
 */
function anchoredBounds(current: Rectangle, targetW: number, targetH: number): Rectangle {
  const wa = screen.getDisplayMatching(current).workArea
  const anchorRight = current.x + current.width / 2 > wa.x + wa.width / 2
  const anchorBottom = current.y + current.height / 2 > wa.y + wa.height / 2
  const x = anchorRight ? current.x + current.width - targetW : current.x
  const y = anchorBottom ? current.y + current.height - targetH : current.y
  return { x, y, width: targetW, height: targetH }
}

export function setWidgetMode(mode: WidgetMode): void {
  if (!widget) return
  const size = WIDGET_SIZES[mode]
  const next = anchoredBounds(widget.getBounds(), size.width, size.height)
  widget.setBounds(next, process.platform === 'darwin')
  if (mode === 'compact') setWidgetBounds(next)
}

export function moveWidgetBy(dx: number, dy: number): void {
  if (!widget) return
  const b = widget.getBounds()
  widget.setBounds({ ...b, x: b.x + Math.round(dx), y: b.y + Math.round(dy) })
}

/** Persist the resting (compact) position after a drag ends. */
export function commitWidgetPosition(): void {
  if (!widget) return
  const size = WIDGET_SIZES.compact
  const compact = anchoredBounds(widget.getBounds(), size.width, size.height)
  setWidgetBounds(compact)
}
