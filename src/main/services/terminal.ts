/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import treeKill from 'tree-kill'
import { getStore } from './store'

interface TerminalSession {
  pid: number
  process: any
  isRestarting?: boolean
}

const terminals: Record<string, TerminalSession> = {}

const delay = (ms: number): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, ms))

export function getActiveTerminalIds(): string[] {
  const keys = Object.keys(terminals)
  return keys
}

export function setupTerminalHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('terminal', async (_event, action: string, payload: any) => {
    switch (action) {
      case 'create': {
        const { id, cwd, command } = payload as { id: string; cwd: string; command: string }

        if (terminals[id]) {
          console.log(`[Terminal] Restarting session ${id} (Killing PID ${terminals[id].pid})...`)
          terminals[id].isRestarting = true
          killProcess(id)
          await delay(500)
        }

        try {
          const store = await getStore()
          const settings = store.get('settings')
          const shell = settings?.terminalShell || true

          console.log(`[Terminal] Launching: ${command}`)

          const env = {
            ...process.env,
            FORCE_COLOR: '1',
            TERM: 'xterm-256color'
          }

          const child = spawn(command, [], {
            cwd,
            shell: shell,
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            env
          })

          if (!child.pid) return { success: false, error: 'Failed to get PID' }

          terminals[id] = { pid: child.pid, process: child }

          child.stdout?.on('data', (data) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
            }
          })

          child.stderr?.on('data', (data) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
            }
          })

          child.on('close', (code) => {
            const session = terminals[id]
            const isRestarting = session?.isRestarting

            if (!isRestarting && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send(
                `terminal:incoming:${id}`,
                `\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`
              )
              mainWindow.webContents.send(`terminal:exit:${id}`, code)
            }
            if (session && session.pid === child.pid) {
              if (!isRestarting) delete terminals[id]
            }
          })

          child.on('error', (err) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send(
                `terminal:incoming:${id}`,
                `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`
              )
            }
          })

          return { success: true, pid: child.pid }
        } catch (e: any) {
          return { success: false, error: e.message }
        }
      }

      case 'kill': {
        const { id } = payload as { id: string }
        killProcess(id)
        return true
      }

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

  if (pid) {
    treeKill(pid, 'SIGKILL', () => {})
  }
}
