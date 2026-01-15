import path from 'path'
import { BaseDetector } from './base'
import { Project } from '../../shared/types'

class RustDetectorImpl extends BaseDetector {
  async isMatch(folderPath: string): Promise<boolean> {
    return this.fileExists(folderPath, 'Cargo.toml')
  }

  async parse(folderPath: string): Promise<Partial<Project>> {
    const content = await this.readFile(folderPath, 'Cargo.toml')

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
      if (await this.fileExists(folderPath, path.join('src', 'main.rs'))) {
        isRunnable = true
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
      name,
      version,
      scripts,
      runnerCommand: undefined,
      installCommand: 'cargo build'
    } as Partial<Project>
  }
}

export const RustDetector = new RustDetectorImpl()
