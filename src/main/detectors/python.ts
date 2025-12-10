import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

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

    let runner = process.platform === 'win32' ? 'python' : 'python3'
    let install = 'pip install -r requirements.txt'

    try {
      const tomlPath = path.join(folderPath, 'pyproject.toml')
      const tomlContent = await fs.readFile(tomlPath, 'utf-8')
      if (tomlContent.includes('[tool.poetry]')) {
        runner = 'poetry run python'
        install = 'poetry install'
      }
    } catch {
      /* ignore */
    }

    const possibleEntries = ['main.py', 'app.py', 'server.py', 'index.py']
    let entryFile = ''

    for (const file of possibleEntries) {
      try {
        await fs.access(path.join(folderPath, file))
        entryFile = file
        break
      } catch {
        continue
      }
    }

    if (entryFile) {
      scripts['run'] = entryFile
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
