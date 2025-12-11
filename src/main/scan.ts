import fs from 'fs/promises'
import type { Dirent } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import simpleGit, { DefaultLogFields, ListLogLine } from 'simple-git'
import { Project, ProjectType, GitInfo } from '../shared/types'

import { NodeDetector } from './detectors/node'
import { PythonDetector } from './detectors/python'
import { RustDetector } from './detectors/rust'
import { GoDetector } from './detectors/go'

const DETECTORS = [NodeDetector, PythonDetector, RustDetector, GoDetector] as const

async function getGitInfo(projectPath: string): Promise<GitInfo | null> {
  try {
    const git = simpleGit(projectPath)

    const isRepo = await git.checkIsRepo()
    if (!isRepo) return null

    const status = await git.status().catch(() => null)
    if (!status) return null

    let lastCommitMessage: string | null = null
    let lastCommitAuthor: string | null = null
    let lastCommitDate: Date | null = null

    try {
      const logs = await git.log({ maxCount: 1 })
      const latest = logs.latest as (DefaultLogFields & ListLogLine) | null

      if (latest) {
        lastCommitMessage = latest.message
        lastCommitAuthor = latest.author_name
        lastCommitDate = new Date(latest.date)
      }
    } catch {
      // Repo might have no commits yet (clean init)
    }

    const filesChanged = status.files.length
    const isClean = filesChanged === 0

    return {
      branch: status.current || 'HEAD',
      isClean,
      filesChanged,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      lastCommitMessage,
      lastCommitAuthor,
      lastCommitDate
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
    // Avoid deep recursion and node_modules
    if (depth > 4) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    // 1. Check if this folder is a project
    for (const detector of DETECTORS) {
      try {
        const match = await detector.isMatch(dirPath)
        if (!match) continue

        // Parse details
        const details = await detector.parse(dirPath)

        // Fetch Git and FS stats in parallel
        const [gitInfo, lastModified] = await Promise.all([
          getGitInfo(dirPath),
          getLastModifiedTime(dirPath)
        ])

        const project: Project = {
          id: randomUUID(),
          name: path.basename(dirPath),
          path: dirPath,
          type: details.type as ProjectType,
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
        return // Stop recursing here if it's a project root
      } catch (err) {
        console.warn(`[Scanner] Skipped ${dirPath}:`, (err as Error).message)
      }
    }

    // 2. Recurse into subdirectories
    const subDirs = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'target', 'vendor', 'venv', '__pycache__'].includes(
          entry.name
        )
    )

    await Promise.all(subDirs.map((entry) => scanDir(path.join(dirPath, entry.name), depth + 1)))
  }

  await scanDir(rootPath)

  return Array.from(projects.values()).sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  )
}
