/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import treeKill from 'tree-kill'
import os from 'os'

interface TerminalSession {
  pid: number
}

const terminals: Record<string, TerminalSession> = {}

export function setupTerminalHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('terminal', async (_event, action: string, payload: any) => {
    switch (action) {
      case 'create': {
        const { id, cwd, command } = payload as { id: string; cwd: string; command: string }

        if (terminals[id]) {
          killProcess(id)
        }

        try {
          console.log(`[Terminal] Launching External: ${command}`)

          const isWin = os.platform() === 'win32'
          let child

          if (isWin) {
            child = spawn('cmd.exe', ['/k', command], {
              cwd,
              detached: true,
              shell: false,
              stdio: 'ignore',
              env: process.env
            })
          } else {
            child = spawn(command, [], {
              cwd,
              shell: true,
              detached: true,
              stdio: 'ignore',
              env: process.env
            })
          }

          child.unref()

          const pid = child.pid
          if (!pid) return { success: false, error: 'Failed to get PID' }

          terminals[id] = { pid }

          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(
              `terminal:incoming:${id}`,
              `\r\n\x1b[32m🚀 Launched in external terminal.\r\n(Check the new window. It will stay open on error.)\x1b[0m\r\n`
            )
          }

          return { success: true, pid }
        } catch (e: any) {
          return { success: false, error: e.message }
        }
      }

      case 'kill': {
        const { id } = payload as { id: string }
        killProcess(id)
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`terminal:exit:${id}`, 0)
        }
        return true
      }

      case 'write':
      case 'resize':
        return true

      default:
        return { success: false, error: 'Unknown action' }
    }
  })
}

function killProcess(id: string): void {
  const session = terminals[id]
  if (!session) return

  const { pid } = session
  delete terminals[id]

  if (pid) {
    treeKill(pid, 'SIGKILL', (err) => {
      if (err) console.error(`Failed to kill process ${pid}:`, err)
    })
  }
}
