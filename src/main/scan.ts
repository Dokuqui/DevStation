import fs from 'fs/promises'
import type { Dirent } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import simpleGit from 'simple-git'
import { Project, ProjectType } from '../shared/types'

import { NodeDetector } from './detectors/node'
import { PythonDetector } from './detectors/python'
import { RustDetector } from './detectors/rust'
import { GoDetector } from './detectors/go'

const DETECTORS = [NodeDetector, PythonDetector, RustDetector, GoDetector] as const

async function getGitInfo(projectPath: string): Promise<{
  branch: string | null
  status: 'modified' | 'clean'
  ahead: number
  behind: number
  dirty: boolean
} | null> {
  try {
    const git = simpleGit(projectPath)
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return null

    const status = await git.status()

    const hasChanges =
      status.files.length > 0 || status.staged.length > 0 || status.not_added.length > 0

    return {
      branch: status.current || null,
      status: hasChanges ? ('modified' as const) : ('clean' as const),
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      dirty: hasChanges
    }
  } catch {
    return null
  }
}

async function getLastModifiedTime(folderPath: string): Promise<Date> {
  try {
    const stat = await fs.stat(folderPath)
    return stat.mtime
  } catch {
    return new Date(0)
  }
}

export async function scanProjects(rootPath: string): Promise<Project[]> {
  const projects = new Map<string, Project>()

  async function scanDir(dirPath: string, depth = 0): Promise<void> {
    if (depth > 4) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const detector of DETECTORS) {
      try {
        const match = await detector.isMatch(dirPath)
        if (!match) continue

        const details = await detector.parse(dirPath)
        const type: ProjectType = details.type!

        const gitInfo = await getGitInfo(dirPath)
        const lastModified = await getLastModifiedTime(dirPath)

        const project: Project = {
          id: randomUUID(),
          name: path.basename(dirPath),
          path: dirPath,
          type,
          version: details.version ?? null,
          scripts: details.scripts ?? {},
          runnerCommand: details.runnerCommand,
          installCommand: details.installCommand,
          dependencies: details.dependencies ? Object.keys(details.dependencies).length : 0,
          devDependencies: details.devDependencies
            ? Object.keys(details.devDependencies).length
            : 0,
          lastModified,
          git: gitInfo,
          isFavorite: false
        }

        projects.set(dirPath, project)
        return
      } catch (err) {
        console.warn(`[Scanner] Failed in ${dirPath}:`, (err as Error).message)
      }
    }

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', '.git', 'venv', '__pycache__', '.venv'].includes(
          entry.name
        )
      ) {
        await scanDir(path.join(dirPath, entry.name), depth + 1)
      }
    }
  }

  await scanDir(rootPath)

  return Array.from(projects.values()).sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  )
}
