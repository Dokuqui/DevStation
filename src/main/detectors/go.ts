import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

const TARGET_FILES = ['go.mod']

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

    const files = await fs.readdir(folderPath)
    if (files.some((f) => f.endsWith('.go'))) return true

    return false
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
      if (match) {
        moduleName = match[1]
      }
    } catch {
      /* empty */
    }

    scripts['build'] = 'build .'
    scripts['run'] = 'run .'
    scripts['test'] = 'test ./...'

    return {
      type: 'go',
      name: moduleName,
      version: '1.0.0',
      scripts,
      runnerCommand: runner
    } as Partial<Project>
  }
}
