import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { scanProjects } from './scan'
import { setupTerminalHandlers } from './terminal'
import { exec } from 'child_process'
import { detectIDEs, openInIDE } from './ide'
import { IDE } from '../shared/types'

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('projects:scan', async (_event, rootPath: string) => {
  return await scanProjects(rootPath)
})

ipcMain.handle('project:open-vscode', async (_event, path: string) => {
  exec(`code "${path}"`, (error) => {
    if (error) console.error('Failed to open VSCode:', error)
  })
})

ipcMain.handle('project:open-terminal', async (_event, path: string) => {
  const platform = process.platform
  let command = ''

  if (platform === 'darwin') {
    command = `open -a Terminal "${path}"`
  } else if (platform === 'win32') {
    command = `start cmd.exe /K "cd /d ${path}"`
  } else if (platform === 'linux') {
    command = `x-terminal-emulator --working-directory="${path}" || gnome-terminal --working-directory="${path}" || konsole --workdir "${path}"`
  }

  if (command) {
    exec(command, (err) => {
      if (err) console.error('Failed to open terminal', err)
    })
  }
})

ipcMain.handle('ide:detect', async () => {
  const ides = await detectIDEs()
  return ides.map((ide) => ide.id)
})

ipcMain.handle('ide:open', async (_event, { ideId, path }: { ideId: IDE; path: string }) => {
  try {
    await openInIDE(ideId, path)
  } catch (err) {
    console.error('Failed to open IDE:', err)
  }
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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
