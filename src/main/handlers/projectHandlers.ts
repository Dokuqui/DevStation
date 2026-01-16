import { ipcMain, BrowserWindow, dialog } from 'electron'
import { scanProjects } from '../services/scan'
import { openInIDE, detectIDEs, selectCustomIDE } from '../services/ide'
import { getProjectTimes, updateKnownProjects } from '../services/tracker'
import { spawn } from 'child_process'
import { registerExternalProcess } from '../services/tracker'
import { createHash } from 'crypto'
import { IDE } from '@renderer/types'

function generateId(projectPath: string): string {
  return createHash('md5').update(projectPath).digest('hex')
}

export function registerProjectHandlers(): void {
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
}
