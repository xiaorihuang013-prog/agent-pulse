import { app, Menu, nativeImage, Tray } from 'electron'
import type { MockAgent } from './mockAgent'
import { getSettings, setSoundEnabled } from './settings'
import { getWidget, showMainWindow, toggleWidgetVisibility } from './windows'

// 32×32 acid-lime "pulse" mark (dot + ring), generated programmatically.
const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABOklEQVR42u1XKw7DMAwdGCvvFQp3BKtgcLx0N6h6gu4Go4Ulk8pGi3qWyQd5kyVrIIv7nxIwS1ZUJ7YT59lxD4c/LSQGJQw6MejMoIuO8p382rE4uzNoYFDPoJZBjY69ymX+srdjOeGDQR2DrgzKjHWZzne6/ryH80pPVizUK1Sv2uL8puHNVupnqn9be3JRTo35nEElg2odc2NdqnaqpXc++E6uzl4MgodFXhqRGGZjQgFUOLIjg56GY5dl3dGDicfcVOs88rnOP5vw2OgmU1Tz+OoJO1Zw6diRFL1PVbivux+58yl+GVhIrA1IOe09aMcGzh17UjFPY+hvdwq/dQ2tmQ0KwMaR1Rs3UDv2GhOIMUQgOAbCZkHwOhBFJQz+FkTxGgbvB6LoiKLoCaPoiqP4L4jmz+hPv6I3j9RA0abLRoAAAAAASUVORK5CYII='

let tray: Tray | null = null

export function createTray(agent: MockAgent): void {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)
  tray = new Tray(icon)
  tray.setToolTip('Agent Pulse')
  rebuildMenu(agent)
}

function rebuildMenu(agent: MockAgent): void {
  if (!tray) return
  const sound = getSettings().soundEnabled

  const menu = Menu.buildFromTemplate([
    { label: 'Show / Hide Widget', click: () => toggleWidgetVisibility() },
    { label: 'Open Main Window', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Start Task', click: () => agent.start() },
    { label: 'Pause', click: () => agent.pause() },
    { label: 'Resume', click: () => agent.resume() },
    { label: 'Cancel', click: () => agent.cancel() },
    { label: 'Simulate Failure', click: () => agent.fail() },
    { type: 'separator' },
    {
      label: 'Sound',
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        setSoundEnabled(item.checked)
        getWidget()?.webContents.send('settings:changed', {
          soundEnabled: item.checked,
          theme: getSettings().theme
        })
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}
