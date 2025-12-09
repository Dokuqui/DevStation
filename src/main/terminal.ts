import { spawn, ChildProcess } from 'child_process'
import { ipcMain, BrowserWindow } from 'electron'
import treeKill from 'tree-kill'

const terminals: Record<string, ChildProcess> = {}

export function setupTerminalHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('terminal:create', (_, id: string, cwd: string, command: string) => {
    // 1. Cleanup existing process if restarting
    if (terminals[id]) {
      killProcess(terminals[id])
      delete terminals[id]
    }

    try {
      console.log(`[Terminal] Spawning: ${command}`)

      // 2. Spawn the process
      // shell: true is critical for Windows
      const child = spawn(command, [], {
        cwd: cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' }
      })

      terminals[id] = child

      // 3. Listen for Output
      child.stdout?.on('data', (data) => {
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
      })

      child.stderr?.on('data', (data) => {
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send(`terminal:incoming:${id}`, data.toString())
      })

      // 4. Handle Exit
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

// 💀 Robust Kill Function using 'tree-kill'
function killProcess(child: ChildProcess): void {
  if (!child.pid) return

  // This library handles the Windows/Mac/Linux differences perfectly
  treeKill(child.pid, 'SIGKILL', (err) => {
    if (err) {
      console.error('Failed to kill process tree:', err)
    } else {
      console.log(`Successfully killed process ${child.pid}`)
    }
  })
}
