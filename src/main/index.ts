import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { scanProjects } from './scan'
import { setupTerminalHandlers } from './terminal'
import { spawn } from 'child_process'
import { detectIDEs, openInIDE, selectCustomIDE } from './ide'
import { IDE } from '../shared/types'
import {
  getProjectTimes,
  registerExternalProcess,
  startTimeTracker,
  updateKnownProjects
} from './tracker'
import { createHash } from 'crypto'
import { startSystemMonitor } from './monitor'

function generateId(projectPath: string): string {
  return createHash('md5').update(projectPath).digest('hex')
}

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('projects:scan', async (event, rootPath: string) => {
  const window = BrowserWindow.fromWebContents(event.sender)

  const onLog = (msg: string): void => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('scan:log', msg)
    }
  }

  const projects = await scanProjects(rootPath, onLog)

  updateKnownProjects(projects.map((p) => ({ id: p.id, name: p.name })))

  return projects
})

ipcMain.handle('project:open-vscode', async (_event, path: string) => {
  await openInIDE('vscode', path).catch(console.error)
})

ipcMain.handle('project:open-terminal', async (_event, path: string) => {
  const platform = process.platform
  let command

  try {
    if (platform === 'darwin') {
      command = spawn('open', ['-a', 'Terminal', path])
    } else if (platform === 'win32') {
      command = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${path}"`], {
        shell: true,
        detached: true,
        stdio: 'ignore'
      })
    } else if (platform === 'linux') {
      const term = 'x-terminal-emulator'
      command = spawn(term, ['--working-directory', path], { detached: true })
    }

    if (command & command.pid) {
      command.unref()
      const projectId = generateId(path)
      registerExternalProcess(command.pid, projectId)
    }
  } catch (err) {
    console.error('Failed to open external terminal:', err)
  }
})

ipcMain.handle('ide:detect', async () => {
  return await detectIDEs()
})

ipcMain.handle('ide:open', async (_event, { ideId, path }: { ideId: IDE; path: string }) => {
  try {
    await openInIDE(ideId, path)
  } catch (err) {
    console.error('Failed to open IDE:', err)
  }
})

ipcMain.handle('ide:select-custom', async () => {
  return await selectCustomIDE()
})

ipcMain.handle('time:get-all', () => {
  return getProjectTimes()
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setupTerminalHandlers(mainWindow)
  startTimeTracker(mainWindow)
  startSystemMonitor(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    startTimeTracker(mainWindow)
    startSystemMonitor(mainWindow)
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.dokuqui.devstation')

  app.on('browser-window-created', (_e, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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
