/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import { dialog } from 'electron'
import { IDE } from '@renderer/types'
import { getStore } from './store'

const execAsync = promisify(exec)

interface IDEConfig {
  id: IDE
  name: string
  bin: string
  appName?: string
  winRegKey?: string
  paths: Partial<Record<NodeJS.Platform, string[]>>
}

const IDES: IDEConfig[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    bin: process.platform === 'win32' ? 'code.cmd' : 'code',
    appName: 'Visual Studio Code.app',
    winRegKey:
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{771FD6BF-0D1B-4A6C-A7AF-8F4E61A0D5E0}_is1',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [
        `${process.env.PROGRAMFILES}\\Microsoft VS Code`,
        `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code`
      ],
      linux: ['/usr/bin', '/usr/local/bin', '/snap/bin', '/opt/vscode']
    }
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    bin: process.platform === 'win32' ? 'pycharm64.exe' : 'pycharm',
    appName: 'PyCharm.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\PyCharm',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains`, `${process.env.LOCALAPPDATA}\\JetBrains`],
      linux: ['/opt/pycharm', '/usr/bin']
    }
  },
  {
    id: 'goland',
    name: 'GoLand',
    bin: process.platform === 'win32' ? 'goland64.exe' : 'goland',
    appName: 'GoLand.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\GoLand',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains`, `${process.env.LOCALAPPDATA}\\JetBrains`],
      linux: ['/opt/goland', '/usr/bin']
    }
  },
  {
    id: 'rider',
    name: 'Rider',
    bin: process.platform === 'win32' ? 'rider64.exe' : 'rider',
    appName: 'Rider.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\Rider',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains`, `${process.env.LOCALAPPDATA}\\JetBrains`],
      linux: ['/opt/rider']
    }
  },
  {
    id: 'rustrover',
    name: 'RustRover',
    bin: process.platform === 'win32' ? 'rustrover64.exe' : 'rustrover',
    appName: 'RustRover.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\RustRover',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains`, `${process.env.LOCALAPPDATA}\\JetBrains`],
      linux: ['/opt/rustrover']
    }
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    bin: process.platform === 'win32' ? 'subl.exe' : 'subl',
    appName: 'Sublime Text.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Sublime Text',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\Sublime Text`],
      linux: ['/opt/sublime_text', '/usr/bin']
    }
  }
]

async function findBinaryRecursive(
  root: string,
  binaryNames: string[],
  maxDepth = 5
): Promise<string | null> {
  async function walk(dir: string, depth: number): Promise<string | null> {
    if (depth > maxDepth) return null

    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return null
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isFile() && binaryNames.includes(entry.name)) {
        return fullPath
      }

      if (entry.isDirectory()) {
        const found = await walk(fullPath, depth + 1)
        if (found) return found
      }
    }
    return null
  }

  return walk(root, 0)
}

async function findBinary(ide: IDEConfig): Promise<string | null> {
  const platform = os.platform()
  const isWin = platform === 'win32'

  try {
    const cmd = isWin ? `where ${ide.bin}` : `which ${ide.bin}`
    const { stdout } = await execAsync(cmd)
    return stdout.split(/\r?\n/)[0].trim()
  } catch {
    // empty
  }

  if (platform === 'darwin' && ide.appName) {
    const appPath = path.join('/Applications', ide.appName)
    const binPath = path.join(appPath, 'Contents', 'MacOS', ide.bin)
    try {
      await fs.access(binPath)
      return binPath
    } catch {
      // empty
    }
  }

  const binaryCandidates = isWin ? [ide.bin] : [ide.bin]

  const roots = ide.paths[platform] || []
  for (let root of roots) {
    root = root.replace('~', os.homedir())
    const found = await findBinaryRecursive(root, binaryCandidates)
    if (found) return found
  }

  if (isWin && ide.winRegKey) {
    try {
      const regCmd = `reg query "${ide.winRegKey}" /v InstallLocation`
      const { stdout } = await execAsync(regCmd)
      const match = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/)
      if (match) {
        const installDir = match[1].trim()
        const found = await findBinaryRecursive(installDir, [ide.bin])
        if (found) return found
      }
    } catch {
      // empty
    }
  }

  return null
}

export async function detectIDEs(): Promise<any[]> {
  const available: any[] = []

  for (const ide of IDES) {
    const binPath = await findBinary(ide)
    if (binPath) {
      available.push({ ...ide, bin: binPath })
    }
  }

  const s = await getStore()
  const custom = s.get('customIDE')
  if (custom) {
    available.push({
      id: 'custom',
      name: custom.name,
      bin: custom.path
    })
  }

  return available
}

export async function selectCustomIDE(): Promise<{ name: string; path: string } | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Editor Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'app', 'cmd', 'bat', 'sh'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (canceled || filePaths.length === 0) return null

  const selectedPath = filePaths[0]
  const name = path.basename(selectedPath, path.extname(selectedPath))

  const s = await getStore()
  s.set('customIDE', { name, path: selectedPath })

  return { name, path: selectedPath }
}

export async function openInIDE(ideId: IDE, projectPath: string): Promise<void> {
  const ides = await detectIDEs()
  const ide = ides.find((i) => i.id === ideId)
  if (!ide) throw new Error(`IDE ${ideId} not found`)

  let command: string

  if (process.platform === 'darwin') {
    command = `open -a "${ide.name}" "${projectPath}"`
  } else {
    command = `"${ide.bin}" "${projectPath}"`
  }

  exec(command, (error) => {
    if (error) console.error(`Failed to open ${ide.name}:`, error)
  })
}
