import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

const TARGET_FILES = ['go.mod', 'main.go']

export const GoDetector: ProjectDetector = {
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
      return files.some((f) => f.endsWith('.go'))
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const name = path.basename(folderPath)
    let moduleName = name
    const scripts: Record<string, string> = {}
    const runner = 'go'

    try {
      const modPath = path.join(folderPath, 'go.mod')
      const modContent = await fs.readFile(modPath, 'utf-8')
      const match = modContent.match(/^module\s+([^\s]+)/m)
      if (match) moduleName = match[1]
    } catch {
      /* ignore */
    }

    try {
      await fs.access(path.join(folderPath, 'main.go'))
      scripts['run'] = 'run main.go'
    } catch {
      scripts['run'] = 'run .'
    }

    scripts['build'] = 'build .'
    scripts['test'] = 'test ./...'

    return {
      type: 'go',
      name: moduleName,
      version: '1.0.0',
      scripts,
      runnerCommand: runner,
      installCommand: 'go mod download'
    } as Partial<Project>
  }
}
