import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'cross-spawn'
import type { ChildProcess } from 'child_process'
import treeKill from 'tree-kill'

const terminals: Record<string, ChildProcess> = {}

export function setupTerminalHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('terminal:create', (_, id: string, cwd: string, command: string) => {
    if (terminals[id]) {
      killProcess(terminals[id])
      delete terminals[id]
    }

    try {
      const parts = command.split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)

      const child = spawn(cmd, args, {
        cwd,
        env: { ...process.env, FORCE_COLOR: '1' },
        shell: false,
        detached: process.platform === 'win32'
      })

      terminals[id] = child

      child.stdout?.on('data', (data) => {
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
      })

      child.stderr?.on('data', (data) => {
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
      })

      child.on('exit', () => {
        if (!mainWindow.isDestroyed()) mainWindow.webContents.send(`terminal:exit:${id}`)
        delete terminals[id]
      })

      return { success: true, pid: child.pid }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.on('terminal:write', (_, id: string, data: string) => {
    terminals[id]?.stdin?.write(data)
  })

  ipcMain.handle('terminal:kill', (_, id: string) => {
    const child = terminals[id]
    if (child) {
      killProcess(child)
      delete terminals[id]
    }
    return true
  })

  ipcMain.on('terminal:resize', () => {})
}

function killProcess(child: ChildProcess): void {
  if (!child.pid) return

  treeKill(child.pid, (err) => {
    if (err) {
      console.error('Failed to kill process tree:', err)
    }
  })
}
