import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

export const RustDetector: ProjectDetector = {
  async isMatch(folderPath: string) {
    try {
      await fs.access(path.join(folderPath, 'Cargo.toml'))
      return true
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const cargoPath = path.join(folderPath, 'Cargo.toml')
    const content = await fs.readFile(cargoPath, 'utf-8')

    const nameMatch = content.match(/name\s*=\s*"([^"]+)"/)
    const name = nameMatch ? nameMatch[1] : path.basename(folderPath)

    return {
      type: 'rust',
      name: name,
      version: '0.1.0',
      scripts: {
        build: 'build',
        run: 'run',
        test: 'test',
        check: 'check'
      },
      runnerCommand: 'cargo'
    } as Partial<Project>
  }
}
