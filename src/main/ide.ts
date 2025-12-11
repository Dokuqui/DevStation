import { exec } from 'child_process'
import { promisify } from 'util'
import { IDE } from '../shared/types'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'

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
    bin: 'code',
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
    bin: 'pycharm',
    appName: 'PyCharm.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\PyCharm',
    paths: {
      darwin: ['/Applications', '~/Applications', '/Applications/PyCharm CE.app'],
      win32: [
        `${process.env.PROGRAMFILES}\\JetBrains\\PyCharm`,
        `${process.env.LOCALAPPDATA}\\JetBrains\\Toolbox\\apps\\PyCharm`
      ],
      linux: ['/opt/pycharm', '~/pycharm']
    }
  },
  {
    id: 'rustrover',
    name: 'RustRover',
    bin: 'rustrover',
    appName: 'RustRover.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\RustRover',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains\\RustRover`],
      linux: ['/opt/rustrover']
    }
  },
  {
    id: 'goland',
    name: 'GoLand',
    bin: 'goland',
    appName: 'GoLand.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\JetBrains\\GoLand',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\JetBrains\\GoLand`],
      linux: ['/opt/goland']
    }
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    bin: 'subl',
    appName: 'Sublime Text.app',
    winRegKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Sublime Text',
    paths: {
      darwin: ['/Applications', '~/Applications'],
      win32: [`${process.env.PROGRAMFILES}\\Sublime Text`],
      linux: ['/opt/sublime_text', '/usr/bin/subl']
    }
  }
]

async function findBinary(ide: IDEConfig): Promise<string | null> {
  const platform = os.platform()
  const isWin = platform === 'win32'

  try {
    const cmd = isWin ? `where ${ide.bin}` : `which ${ide.bin}`
    const { stdout } = await execAsync(cmd)
    return stdout.trim()
  } catch {
    // empty
  }

  const paths = ide.paths[platform] || []
  for (let basePath of paths) {
    basePath = basePath.replace('~', os.homedir())
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.includes(ide.name)) {
          let binPath: string
          if (platform === 'darwin') {
            binPath = path.join(basePath, entry.name, 'Contents/MacOS', ide.bin)
          } else if (isWin) {
            binPath = path.join(basePath, entry.name, 'bin', `${ide.bin}${isWin ? '.exe' : ''}`)
          } else {
            binPath = path.join(basePath, entry.name, ide.bin)
          }
          await fs.access(binPath)
          return binPath
        }
      }
    } catch {
      // empty
    }
  }

  if (isWin && ide.winRegKey) {
    try {
      const regCmd = `reg query "${ide.winRegKey}" /v InstallLocation`
      const { stdout } = await execAsync(regCmd)
      const match = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/)
      if (match) {
        const installDir = match[1].trim()
        const binPath = path.join(installDir, 'bin', `${ide.bin}.exe`)
        await fs.access(binPath)
        return binPath
      }
    } catch {
      // empty
    }
  }

  return null
}

export async function detectIDEs(): Promise<IDEConfig[]> {
  const available: IDEConfig[] = []
  for (const ide of IDES) {
    const binPath = await findBinary(ide)
    if (binPath) {
      available.push({ ...ide, bin: binPath })
    }
  }
  return available
}

export async function openInIDE(ideId: IDE, projectPath: string): Promise<void> {
  const ide = await detectIDEs().then((ides) => ides.find((i) => i.id === ideId))
  if (!ide) throw new Error(`IDE ${ideId} not found`)

  let command: string

  switch (ide.id) {
    case 'vscode':
      command = `"${ide.bin}" "${projectPath}"`
      break
    case 'sublime':
      command = `"${ide.bin}" "${projectPath}"`
      break
    default: // JetBrains
      if (process.platform === 'darwin') {
        command = `open -a "${ide.name}" "${projectPath}"`
      } else {
        command = `"${ide.bin}" "${projectPath}"`
      }
      break
  }

  if (!command) throw new Error(`No open command for ${ide.name}`)

  exec(command, (error) => {
    if (error) console.error(`Failed to open ${ide.name}:`, error)
  })
}
