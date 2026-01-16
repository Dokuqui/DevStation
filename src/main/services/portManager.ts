import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

export const COMMON_PORTS = [3000, 3001, 3002, 4000, 4200, 5000, 5173, 8000, 8080]

interface PortInfo {
  port: number
  pid?: number
  processName?: string
  status: 'active' | 'free'
}

export async function checkPort(port: number): Promise<PortInfo> {
  const platform = os.platform()

  try {
    let cmd = ''
    if (platform === 'win32') {
      cmd = `netstat -ano | findstr :${port}`
    } else {
      cmd = `lsof -i :${port} -t`
    }

    const { stdout } = await execAsync(cmd).catch(() => ({ stdout: '' }))

    if (!stdout.trim()) {
      return { port, status: 'free' }
    }

    let pid = 0
    if (platform === 'win32') {
      const parts = stdout.trim().split(/\s+/)
      pid = parseInt(parts[parts.length - 1], 10)
    } else {
      pid = parseInt(stdout.trim().split('\n')[0], 10)
    }

    return { port, pid, status: 'active' }
  } catch {
    return { port, status: 'free' }
  }
}

export async function killPort(port: number): Promise<boolean> {
  const info = await checkPort(port)
  if (info.status === 'free' || !info.pid) return false

  try {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /F /PID ${info.pid}`)
    } else {
      await execAsync(`kill -9 ${info.pid}`)
    }
    return true
  } catch (e) {
    console.error(`Failed to kill port ${port}`, e)
    return false
  }
}

export async function scanCommonPorts(): Promise<PortInfo[]> {
  const results = await Promise.all(COMMON_PORTS.map((p) => checkPort(p)))
  return results.filter((p) => p.status === 'active')
}
