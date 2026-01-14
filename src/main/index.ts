import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { getStore } from './store'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { scanProjects } from './scan'
import { setupTerminalHandlers } from './terminal'
import { spawn } from 'child_process'
import { detectIDEs, openInIDE, selectCustomIDE } from './ide'
import { IDE, Workflow } from '../shared/types'
import {
  getProjectTimes,
  registerExternalProcess,
  startTimeTracker,
  updateKnownProjects
} from './tracker'
import { createHash } from 'crypto'
import { startSystemMonitor } from './monitor'
import {
  dockerComposeDown,
  dockerComposeUp,
  dockerPrune,
  killProcessByName,
  restartDocker,
  startDocker,
  stopDocker
} from './commands'
import {
  registerAllWorkflows,
  registerWorkflow,
  stopAllWorkflows,
  unregisterWorkflow
} from './workflows/scheduler'
import { runWorkflow } from './workflows/engine'
import { cloneRepository, getGitStatus, gitCheckout, gitFetch, gitPull, gitPush } from './git'
import { loginWithGitHub, getGitHubRepos, isGitHubLoggedIn, logoutGitHub } from './github'

function generateId(projectPath: string): string {
  return createHash('md5').update(projectPath).digest('hex')
}

ipcMain.handle('window:update-theme', (_event, theme: 'dark' | 'light') => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (theme === 'light') {
      win.setBackgroundColor('#ffffff')
      win.setTitleBarOverlay({
        color: '#ffffff',
        symbolColor: '#0f172a',
        height: 32
      })
    } else {
      win.setBackgroundColor('#09090b')
      win.setTitleBarOverlay({
        color: '#09090b',
        symbolColor: '#a1a1aa',
        height: 32
      })
    }
  }
})

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

ipcMain.handle('commands:kill-process', async (_event, name: string) => {
  return await killProcessByName(name)
})

ipcMain.handle('commands:restart-docker', async () => {
  return await restartDocker()
})

ipcMain.handle('commands:docker-start', () => startDocker())

ipcMain.handle('commands:docker-stop', () => stopDocker())

ipcMain.handle('commands:docker-prune', () => dockerPrune())

ipcMain.handle('commands:docker-compose-up', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const url = win?.webContents.getURL()
  const cwd = url?.includes('file://') ? process.cwd() : process.cwd()
  return await dockerComposeUp(cwd)
})

ipcMain.handle('commands:docker-compose-down', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const url = win?.webContents.getURL()
  const cwd = url?.includes('file://') ? process.cwd() : process.cwd()
  return await dockerComposeDown(cwd)
})

ipcMain.handle('workflow:save', async (_event, workflow: Workflow) => {
  const store = await getStore() // Load store dynamically
  const currentWorkflows = (store.get('workflows') as Workflow[]) || []

  const index = currentWorkflows.findIndex((w) => w.id === workflow.id)
  let newWorkflows

  if (index !== -1) {
    newWorkflows = [...currentWorkflows]
    newWorkflows[index] = workflow
  } else {
    newWorkflows = [...currentWorkflows, workflow]
  }

  store.set('workflows', newWorkflows)
  registerWorkflow(workflow)
  return { success: true }
})

ipcMain.handle('workflow:get-all', async () => {
  const store = await getStore()
  return store.get('workflows') || []
})

ipcMain.handle('workflow:execute', (_event, workflow: Workflow) => {
  runWorkflow(workflow)
})

ipcMain.handle('workflow:delete', async (_event, workflowId: string) => {
  unregisterWorkflow(workflowId)

  const store = await getStore()
  const current = (store.get('workflows') as Workflow[]) || []
  const filtered = current.filter((w) => w.id !== workflowId)

  store.set('workflows', filtered)
  return { success: true }
})

ipcMain.handle('workflow:stop-all', () => {
  stopAllWorkflows()
  return { success: true }
})

ipcMain.handle('commands:run-workflow', async (_event, workflowJson) => {
  runWorkflow(workflowJson)
  return 'Workflow started'
})

ipcMain.handle('git:clone', async (_event, { url, parentPath, shallow }) => {
  return await cloneRepository(url, parentPath, shallow)
})

ipcMain.handle('git:status', async (_event, path: string) => {
  return await getGitStatus(path)
})

ipcMain.handle('git:pull', async (_event, path: string) => {
  return await gitPull(path)
})

ipcMain.handle('git:push', async (_event, path: string) => {
  return await gitPush(path)
})

ipcMain.handle('git:checkout', async (_event, { path, branch }) => {
  return await gitCheckout(path, branch)
})

ipcMain.handle('git:fetch', async (_event, path: string) => {
  return await gitFetch(path)
})

ipcMain.handle('github:login', async () => {
  return await loginWithGitHub()
})

ipcMain.handle('github:repos', async () => {
  return await getGitHubRepos()
})

ipcMain.handle('github:status', () => {
  return isGitHubLoggedIn()
})

ipcMain.handle('github:logout', () => {
  return logoutGitHub()
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

    backgroundColor: '#09090b',

    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
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
