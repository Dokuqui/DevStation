import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

export const NodeDetector: ProjectDetector = {
  async isMatch(folderPath: string) {
    try {
      await fs.access(path.join(folderPath, 'package.json'))
      return true
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const pkgPath = path.join(folderPath, 'package.json')
    const data = await fs.readFile(pkgPath, 'utf-8')
    const json = JSON.parse(data)

    return {
      type: 'node',
      name: json.name || path.basename(folderPath),
      version: json.version || '0.0.0',
      scripts: json.scripts || {},
      runnerCommand: 'npm run'
    } as Partial<Project>
  }
}
