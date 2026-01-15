import fs from 'fs/promises'
import path from 'path'
import { BaseDetector } from './base'
import { Project } from '../../shared/types'

const TARGET_FILES = ['pyproject.toml', 'requirements.txt', 'Pipfile', 'main.py', 'app.py']

class PythonDetectorImpl extends BaseDetector {
  async isMatch(folderPath: string): Promise<boolean> {
    if (await this.anyFileExists(folderPath, TARGET_FILES)) return true

    // Fallback: check for any .py file
    try {
      const files = await fs.readdir(folderPath)
      return files.some((f) => f.endsWith('.py'))
    } catch {
      return false
    }
  }

  async parse(folderPath: string): Promise<Partial<Project>> {
    const name = path.basename(folderPath)
    const scripts: Record<string, string> = {}

    const isWin = process.platform === 'win32'
    let runner = isWin ? 'python' : 'python3'
    let install = 'pip install -r requirements.txt'

    const venvNames = ['.venv', 'venv', 'env']
    let venvPath = ''

    for (const vName of venvNames) {
      if (await this.fileExists(folderPath, vName)) {
        venvPath = vName
        break
      }
    }

    if (venvPath) {
      const binDir = isWin ? 'Scripts' : 'bin'
      const pythonExc = isWin ? 'python.exe' : 'python'
      const pipExc = isWin ? 'pip.exe' : 'pip'

      runner = path.join(venvPath, binDir, pythonExc)
      install = `${path.join(venvPath, binDir, pipExc)} install -r requirements.txt`
    } else {
      scripts['init:venv'] = `${isWin ? 'python' : 'python3'} -m venv .venv`
    }

    const tomlContent = await this.readFile(folderPath, 'pyproject.toml')
    if (tomlContent) {
      const lines = tomlContent.split('\n')
      let currentSection = ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        if (trimmed.startsWith('[')) {
          currentSection = trimmed
            .replace(/^\[+|\]+$/g, '')
            .replace(/"/g, '')
            .trim()
          if (currentSection.startsWith('tool.poe.tasks.') && currentSection.length > 15) {
            const taskName = currentSection.replace('tool.poe.tasks.', '').trim()
            scripts[taskName] = `-m poethepoet ${taskName}`
          }
          continue
        }

        if (currentSection === 'tool.poe.tasks') {
          const match = trimmed.match(/^"?([\w-]+)"?\s*=/)
          if (match) {
            const taskName = match[1]
            if (!scripts[taskName]) scripts[taskName] = `-m poethepoet ${taskName}`
          }
        }
      }
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
        if (await this.fileExists(folderPath, relPath)) {
          if (file === '__main__.py') {
            entryScript = dir !== '.' ? `-m ${dir}` : '.'
          } else if (dir !== '.') {
            if (await this.fileExists(folderPath, path.join(dir, '__init__.py'))) {
              entryScript = `-m ${dir}.${path.basename(file, '.py')}`
            } else {
              entryScript = relPath
            }
          } else {
            entryScript = relPath
          }
          break outerLoop
        }
      }
    }

    if (entryScript) scripts['run'] = entryScript
    else scripts['help'] = '--version'

    return {
      type: 'python',
      name,
      version: '1.0.0',
      scripts,
      runnerCommand: runner,
      installCommand: install
    } as Partial<Project>
  }
}

export const PythonDetector = new PythonDetectorImpl()
