import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '@renderer/types'

const TARGET_FILES = ['go.mod', 'main.go', 'go.work', 'Makefile']

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
    const scripts: Record<string, string> = {}
    let version = 'unknown'
    const install = 'go mod download'

    try {
      const modPath = path.join(folderPath, 'go.mod')
      const modContent = await fs.readFile(modPath, 'utf-8')
      const versionMatch = modContent.match(/^go\s+([0-9.]+)/m)
      if (versionMatch) {
        version = versionMatch[1]
      }
    } catch {
      // Ignore
    }

    try {
      await fs.access(path.join(folderPath, 'main.go'))
      scripts['run'] = 'go run .'
    } catch {
      // Ignore
    }

    try {
      const cmdPath = path.join(folderPath, 'cmd')
      const cmdEntries = await fs.readdir(cmdPath, { withFileTypes: true })

      for (const entry of cmdEntries) {
        if (entry.isDirectory()) {
          try {
            await fs.access(path.join(cmdPath, entry.name, 'main.go'))
            scripts[`run:${entry.name}`] = `go run ./cmd/${entry.name}`
          } catch {
            // No main.go in this subdir
          }
        }
      }
    } catch {
      // No cmd directory
    }

    try {
      const makePath = path.join(folderPath, 'Makefile')
      const makeContent = await fs.readFile(makePath, 'utf-8')

      const targetRegex = /^([a-zA-Z0-9_-]+):/gm
      let match

      while ((match = targetRegex.exec(makeContent)) !== null) {
        const target = match[1]
        if (target !== '.PHONY' && target !== 'all' && target !== 'help') {
          scripts[target] = `make ${target}`
        }
      }
    } catch {
      // No Makefile
    }

    if (Object.keys(scripts).length === 0) {
      scripts['help'] = 'go help'
    }

    return {
      type: 'go',
      name: name,
      version: version,
      scripts: scripts,
      runnerCommand: undefined,
      installCommand: install
    } as Partial<Project>
  }
}
