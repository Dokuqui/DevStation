import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

export const NodeDetector: ProjectDetector = {
  async isMatch(folderPath: string) {
    const pkgPath = path.join(folderPath, 'package.json')
    try {
      const stat = await fs.stat(pkgPath)
      return stat.isFile()
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const pkgPath = path.join(folderPath, 'package.json')
    const data = await fs.readFile(pkgPath, 'utf-8')
    const json = JSON.parse(data)

    let runner = 'npm run'
    if (
      await fs.access(path.join(folderPath, 'pnpm-lock.yaml')).then(
        () => true,
        () => false
      )
    ) {
      runner = 'pnpm'
    } else if (
      await fs.access(path.join(folderPath, 'yarn.lock')).then(
        () => true,
        () => false
      )
    ) {
      runner = 'yarn'
    }

    return {
      type: 'node' as const,
      name: json.name || path.basename(folderPath),
      version: json.version || '0.0.0',
      scripts: json.scripts || {},
      runnerCommand: runner,
      installCommand: runner.replace(' run', '') + ' install',
      dependencies: json.dependencies || {},
      devDependencies: json.devDependencies || {}
    } as Partial<Project>
  }
}
