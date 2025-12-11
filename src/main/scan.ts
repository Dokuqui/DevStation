import fs from 'fs/promises'
import type { Dirent } from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import simpleGit, { DefaultLogFields, ListLogLine } from 'simple-git'

import { NodeDetector } from './detectors/node'
import { PythonDetector } from './detectors/python'
import { RustDetector } from './detectors/rust'
import { GoDetector } from './detectors/go'
import { GitInfo, Project, ProjectType } from '@renderer/types'
import { CSharpDetector } from './detectors/csharp'

const DETECTORS = [NodeDetector, PythonDetector, RustDetector, GoDetector, CSharpDetector] as const

function generateIds(projectPath: string): string {
  return createHash('md5').update(projectPath).digest('hex')
}

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

export async function scanProjects(
  rootPath: string,
  onLog?: (message: string) => void
): Promise<Project[]> {
  const projects = new Map<string, Project>()

  async function scanDir(dirPath: string, depth = 0): Promise<void> {
    if (depth > 4) return

    if (onLog) onLog(`Searching: ${dirPath}...`)

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    const detectedTypes: string[] = []
    const mergedScripts: Record<string, string> = {}
    let mergedDeps = 0
    let mergedDevDeps = 0
    const installCommands: string[] = []
    let primaryType: ProjectType | null = null
    let projectVersion: string | null = null

    for (const detector of DETECTORS) {
      try {
        const isMatch = await detector.isMatch(dirPath)
        if (!isMatch) continue

        const details = await detector.parse(dirPath)

        if (details.type) {
          detectedTypes.push(details.type)
          if (!primaryType) primaryType = details.type as ProjectType
        }
        if (details.version && !projectVersion) projectVersion = details.version

        const runner = details.runnerCommand ? `${details.runnerCommand} ` : ''

        Object.entries(details.scripts || {}).forEach(([key, val]) => {
          if (details.type === 'node') {
            mergedScripts[key] = `${runner}${key}`
          } else {
            mergedScripts[key] = `${runner}${val}`
          }
        })

        mergedDeps += details.dependencies || 0
        mergedDevDeps += details.devDependencies || 0
        if (details.installCommand) installCommands.push(details.installCommand)
      } catch (err) {
        console.warn(`[Scanner] Error in detector:`, err)
      }
    }

    if (primaryType) {
      if (onLog) onLog(`✨ Found project: ${path.basename(dirPath)} [${detectedTypes.join(', ')}]`)

      const [gitInfo, lastModified] = await Promise.all([
        getGitInfo(dirPath),
        getLastModifiedTime(dirPath)
      ])

      const project: Project = {
        id: generateIds(dirPath),
        name: path.basename(dirPath),
        path: dirPath,
        type: primaryType,
        version: projectVersion,
        scripts: mergedScripts,
        runnerCommand: undefined,
        installCommand: installCommands.join(' && '),
        dependencies: mergedDeps,
        devDependencies: mergedDevDeps,
        lastModified,
        git: gitInfo,
        isFavorite: false
      }

      projects.set(dirPath, project)
      return
    }

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

  if (onLog) onLog(`Starting scan in ${rootPath}`)
  await scanDir(rootPath)
  if (onLog) onLog(`Scan complete. Found ${projects.size} projects.`)

  return Array.from(projects.values()).sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  )
}
