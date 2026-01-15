import path from 'path'
import { BaseDetector } from './base'
import { Project } from '../../shared/types'

class NodeDetectorImpl extends BaseDetector {
  async isMatch(folderPath: string): Promise<boolean> {
    return this.fileExists(folderPath, 'package.json')
  }

  async parse(folderPath: string): Promise<Partial<Project>> {
    const data = await this.readFile(folderPath, 'package.json')
    if (!data) return { type: 'node' } as Partial<Project>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = {}
    try {
      json = JSON.parse(data)
    } catch {
      // Invalid package.json
    }

    let runner = 'npm run'
    if (await this.fileExists(folderPath, 'pnpm-lock.yaml')) {
      runner = 'pnpm'
    } else if (await this.fileExists(folderPath, 'yarn.lock')) {
      runner = 'yarn'
    }

    return {
      type: 'node' as const,
      name: json.name || path.basename(folderPath),
      version: json.version || '0.0.0',
      scripts: json.scripts || {},
      runnerCommand: runner,
      installCommand: runner.replace(' run', '') + ' install',
      dependencies: Object.keys(json.dependencies || {}).length,
      devDependencies: Object.keys(json.devDependencies || {}).length
    } as Partial<Project>
  }
}

export const NodeDetector = new NodeDetectorImpl()
