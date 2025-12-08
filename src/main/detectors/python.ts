import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

const TARGET_FILES = ['pyproject.toml', 'requirements.txt', 'Pipfile', 'main.py']

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
    return false
  },

  async parse(folderPath: string) {
    const name = path.basename(folderPath)
    const scripts: Record<string, string> = {}
    let runner = 'python'

    try {
      const tomlPath = path.join(folderPath, 'pyproject.toml')
      const tomlContent = await fs.readFile(tomlPath, 'utf-8')

      if (tomlContent.includes('[tool.poetry.scripts]')) {
        runner = 'poetry run'
        scripts['start'] = 'start'
      }
    } catch {
      /* empty */
    }

    if (Object.keys(scripts).length === 0) {
      scripts['run'] = 'main.py'
      scripts['test'] = '-m unittest'
    }

    return {
      type: 'python',
      name: name,
      version: '1.0.0',
      scripts: scripts,
      runnerCommand: runner
    } as Partial<Project>
  }
}
