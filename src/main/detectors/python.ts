import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '@renderer/types'

const TARGET_FILES = ['pyproject.toml', 'requirements.txt', 'Pipfile', 'main.py', 'app.py']

export const PythonDetector: ProjectDetector = {
  async isMatch(folderPath: string) {
    for (const file of TARGET_FILES) {
      try {
        await fs.access(path.join(folderPath, file))
        return true
      } catch {
        continue
      }
    }
    try {
      const files = await fs.readdir(folderPath)
      return files.some((f) => f.endsWith('.py'))
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const name = path.basename(folderPath)
    const scripts: Record<string, string> = {}

    const isWin = process.platform === 'win32'
    let runner = isWin ? 'python' : 'python3'
    let install = 'pip install -r requirements.txt'

    const venvNames = ['.venv', 'venv', 'env']
    let venvPath = ''

    for (const vName of venvNames) {
      try {
        await fs.access(path.join(folderPath, vName))
        venvPath = vName
        break
      } catch {
        // continue
      }
    }

    if (venvPath) {
      const binDir = isWin ? 'Scripts' : 'bin'
      const pythonExc = isWin ? 'python.exe' : 'python'
      const pipExc = isWin ? 'pip.exe' : 'pip'

      const venvPython = path.join(venvPath, binDir, pythonExc)
      const venvPip = path.join(venvPath, binDir, pipExc)

      runner = venvPython
      install = `${venvPip} install -r requirements.txt`
    } else {
      scripts['init:venv'] = `${isWin ? 'python' : 'python3'} -m venv .venv`
    }

    try {
      const tomlPath = path.join(folderPath, 'pyproject.toml')
      const tomlContent = await fs.readFile(tomlPath, 'utf-8')
      const lines = tomlContent.split('\n')

      let currentSection = ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        if (trimmed.startsWith('[')) {
          currentSection = trimmed.replace(/^\[+|\]+$/g, '').replace(/"/g, '').trim()

          if (currentSection.startsWith('tool.poe.tasks.') && currentSection.length > 'tool.poe.tasks.'.length) {
            const taskName = currentSection.replace('tool.poe.tasks.', '').trim()
            scripts[taskName] = `-m poethepoet ${taskName}`
          }

          continue
        }

        if (currentSection === 'tool.poe.tasks') {
          const match = trimmed.match(/^"?([\w-]+)"?\s*=/)

          if (match) {
            const taskName = match[1]
            if (!scripts[taskName]) {
              scripts[taskName] = `-m poethepoet ${taskName}`
            }
          }
        }
      }
    } catch {
      /* ignore */
    }

    const searchDirs = ['.', 'src', 'app', 'lib']
    const entryNames = [
      'main.py',
      'app.py',
      'server.py',
      'index.py',
      '__main__.py',
      'wsgi.py',
      'asgi.py'
    ]

    let entryScript = ''

    outerLoop: for (const dir of searchDirs) {
      for (const file of entryNames) {
        const relPath = dir === '.' ? file : path.join(dir, file)

        try {
          await fs.access(path.join(folderPath, relPath))

          if (file === '__main__.py') {
            if (dir !== '.') {
              entryScript = `-m ${dir}`
            } else {
              entryScript = '.'
            }
            break outerLoop
          }

          if (dir !== '.') {
            try {
              await fs.access(path.join(folderPath, dir, '__init__.py'))
              const moduleName = path
                .join(dir, path.basename(file, '.py'))
                .split(path.sep)
                .join('.')
              entryScript = `-m ${moduleName}`
              break outerLoop
            } catch {
              // No __init__.py
            }
          }

          entryScript = relPath
          break outerLoop
        } catch {
          continue
        }
      }
    }

    if (entryScript) {
      scripts['run'] = entryScript
    } else {
      scripts['help'] = '--version'
    }

    return {
      type: 'python',
      name: name,
      version: '1.0.0',
      scripts: scripts,
      runnerCommand: runner,
      installCommand: install
    } as Partial<Project>
  }
}
