import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { getStore } from './store'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { setupTerminalHandlers } from './terminal'
import { Workflow } from '../shared/types'
import { startTimeTracker } from './tracker'
import { startSystemMonitor } from './monitor'
import { registerGitHandlers } from './handlers/gitHandlers'
import { registerProjectHandlers } from './handlers/projectHandlers'
import { registerWorkflowHandlers } from './handlers/workflowHandlers'
import { registerAllWorkflows } from './workflows/scheduler'
import { registerSettingHandlers } from './handlers/settingHandlers'
import { registerCommandHandlers } from './handlers/commandHandlers'
import { registerVaultHandlers } from './handlers/vaultHandler'

ipcMain.handle('window:update-theme', (_event, theme: 'dark' | 'light') => {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return

  if (theme === 'light') {
    win.setBackgroundColor('#f6f5f3')
    win.setTitleBarOverlay({
      color: '#f6f5f3',
      symbolColor: '#5b5870',
      height: 32
    })
  } else {
    win.setBackgroundColor('#0b0b10')
    win.setTitleBarOverlay({
      color: '#0b0b10',
      symbolColor: '#a1a1b3',
      height: 32
    })
  }
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,

    titleBarStyle: 'hidden',

    backgroundColor: '#0b0b10',

    titleBarOverlay: {
      color: '#0b0b10',
      symbolColor: '#a1a1b3',
      height: 32
    },

    vibrancy: 'under-window',
    visualEffectState: 'active',
    trafficLightPosition: { x: 15, y: 10 },

    ...(process.platform === 'linux' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  })

  setupTerminalHandlers(mainWindow)
  startTimeTracker(mainWindow)
  startSystemMonitor(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.dokuqui.devstation')

  registerProjectHandlers()
  registerCommandHandlers()
  registerGitHandlers()
  registerWorkflowHandlers()
  registerSettingHandlers()
  registerVaultHandlers()

  app.on('browser-window-created', (_e, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const store = await getStore()
  const savedWorkflows = (store.get('workflows') as Workflow[]) || []
  if (savedWorkflows.length > 0) {
    console.log(`[Startup] Restoring ${savedWorkflows.length} workflows...`)
    registerAllWorkflows(savedWorkflows)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
