import fs from 'fs/promises'
import path from 'path'
import { BaseDetector } from './base'
import { Project } from '../../shared/types'

const TARGET_FILES = ['go.mod', 'main.go', 'go.work', 'Makefile']

class GoDetectorImpl extends BaseDetector {
  async isMatch(folderPath: string): Promise<boolean> {
    if (await this.anyFileExists(folderPath, TARGET_FILES)) return true

    try {
      const files = await fs.readdir(folderPath)
      return files.some((f) => f.endsWith('.go'))
    } catch {
      return false
    }
  }

  async parse(folderPath: string): Promise<Partial<Project>> {
    const name = path.basename(folderPath)
    const scripts: Record<string, string> = {}
    let version = 'unknown'
    const install = 'go mod download'

    const modContent = await this.readFile(folderPath, 'go.mod')
    if (modContent) {
      const versionMatch = modContent.match(/^go\s+([0-9.]+)/m)
      if (versionMatch) version = versionMatch[1]
    }

    if (await this.fileExists(folderPath, 'main.go')) {
      scripts['run'] = 'go run .'
    }

    try {
      const cmdPath = path.join(folderPath, 'cmd')
      const cmdEntries = await fs.readdir(cmdPath, { withFileTypes: true })
      for (const entry of cmdEntries) {
        if (entry.isDirectory()) {
          if (await this.fileExists(cmdPath, path.join(entry.name, 'main.go'))) {
            scripts[`run:${entry.name}`] = `go run ./cmd/${entry.name}`
          }
        }
      }
    } catch {
      // No cmd directory
    }

    const makeContent = await this.readFile(folderPath, 'Makefile')
    if (makeContent) {
      const targetRegex = /^([a-zA-Z0-9_-]+):/gm
      let match
      while ((match = targetRegex.exec(makeContent)) !== null) {
        const target = match[1]
        if (target !== '.PHONY' && target !== 'all' && target !== 'help') {
          scripts[target] = `make ${target}`
        }
      }
    }

    if (Object.keys(scripts).length === 0) {
      scripts['help'] = 'go help'
    }

    return {
      type: 'go',
      name,
      version,
      scripts,
      runnerCommand: undefined,
      installCommand: install
    } as Partial<Project>
  }
}

export const GoDetector = new GoDetectorImpl()
