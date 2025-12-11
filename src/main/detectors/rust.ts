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
    let content = ''
    try {
      content = await fs.readFile(cargoPath, 'utf-8')
    } catch {
      // ignore
    }

    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m)
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m)

    const name = nameMatch ? nameMatch[1] : path.basename(folderPath)
    const version = versionMatch ? versionMatch[1] : '0.1.0'

    const scripts: Record<string, string> = {
      build: 'cargo build',
      check: 'cargo check',
      test: 'cargo test',
      clippy: 'cargo clippy',
      fmt: 'cargo fmt'
    }

    let isRunnable = content.includes('[[bin]]')

    if (!isRunnable) {
      try {
        await fs.access(path.join(folderPath, 'src', 'main.rs'))
        isRunnable = true
      } catch {
        // Likely a library (src/lib.rs)
      }
    }

    if (isRunnable) {
      scripts['run'] = 'cargo run'
      scripts['run:release'] = 'cargo run --release'
    }

    if (content.includes('[workspace]')) {
      scripts['build:all'] = 'cargo build --workspace'
      scripts['test:all'] = 'cargo test --workspace'
    }

    return {
      type: 'rust',
      name: name,
      version: version,
      scripts: scripts,
      runnerCommand: undefined,
      installCommand: 'cargo build'
    } as Partial<Project>
  }
}
