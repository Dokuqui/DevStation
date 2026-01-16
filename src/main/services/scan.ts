import fs from 'fs/promises'
import type { Dirent } from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import simpleGit, { DefaultLogFields, ListLogLine } from 'simple-git'

import { NodeDetector } from '../detectors/node'
import { PythonDetector } from '../detectors/python'
import { RustDetector } from '../detectors/rust'
import { GoDetector } from '../detectors/go'
import { CSharpDetector } from '../detectors/csharp'
import { GitInfo, Project, ProjectType } from '@renderer/types'
import { getStore } from './store'

const DETECTORS = [NodeDetector, PythonDetector, RustDetector, GoDetector, CSharpDetector] as const

function generateIds(projectPath: string): string {
  return createHash('md5').update(projectPath).digest('hex')
}

async function findProjectRoot(startDir: string): Promise<string> {
  let current = startDir
  const { root } = path.parse(current)

  for (let i = 0; i < 10; i++) {
    if (current === root) return startDir
    try {
      const files = await fs.readdir(current)
      if (files.includes('.git')) return current
    } catch {
      break
    }
    current = path.dirname(current)
  }
  return startDir
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
      // Clean repo
    }

    return {
      branch: status.current || 'HEAD',
      isClean: status.files.length === 0,
      filesChanged: status.files.length,
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
  const projectsMap = new Map<string, Project>()

  const store = await getStore()
  const settings = store.get('settings')

  const baseIgnored = [
    'node_modules',
    'dist',
    'build',
    'target',
    'vendor',
    'venv',
    '__pycache__',
    '.git',
    '.idea',
    '.vscode',
    'bin',
    'obj'
  ]
  const userIgnored = settings?.ignoredFolders
    ? settings.ignoredFolders.split(',').map((s: string) => s.trim())
    : []
  const ignoredSet = new Set([...baseIgnored, ...userIgnored])

  async function scanDir(dirPath: string, depth = 0): Promise<void> {
    if (depth > 5) return
    if (onLog) onLog(`Searching: ${dirPath}...`)

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const detector of DETECTORS) {
      try {
        const isMatch = await detector.isMatch(dirPath)
        if (isMatch) {
          const details = await detector.parse(dirPath)

          const trueRoot = await findProjectRoot(dirPath)
          const relPath = path.relative(trueRoot, dirPath)
          const isRoot = relPath === ''

          let project = projectsMap.get(trueRoot)
          if (!project) {
            const [gitInfo, lastMod] = await Promise.all([
              getGitInfo(trueRoot),
              getLastModifiedTime(trueRoot)
            ])

            project = {
              id: generateIds(trueRoot),
              name: path.basename(trueRoot),
              path: trueRoot,
              type: details.type as ProjectType,
              version: details.version || '0.0.0',
              scripts: {},
              dependencies: 0,
              devDependencies: 0,
              installCommand: details.installCommand || '',
              lastModified: lastMod,
              git: gitInfo,
              isFavorite: false
            }
            projectsMap.set(trueRoot, project)
          }

          project.dependencies = (project.dependencies || 0) + (details.dependencies || 0)
          project.devDependencies = (project.devDependencies || 0) + (details.devDependencies || 0)

          if (details.type === 'node') {
            project.type = 'node'
          } else if (
            project.type !== 'node' &&
            ['python', 'rust', 'go', 'csharp'].includes(details.type || '')
          ) {
            project.type = details.type as ProjectType
          }

          const runner = details.runnerCommand ? `${details.runnerCommand} ` : ''

          Object.entries(details.scripts || {}).forEach(([key, val]) => {
            const scriptName = isRoot ? key : `${key}:${path.basename(dirPath)}`

            let cmd = ''
            if (details.type === 'node') {
              cmd = `${runner}${key}`
            } else {
              cmd = `${runner}${val}`
            }

            if (!isRoot) {
              cmd = `(cd ${relPath} && ${cmd})`
            }

            project!.scripts[scriptName] = cmd
          })
        }
      } catch (err) {
        console.warn(`[Scanner] Error:`, err)
      }
    }

    const subDirs = entries.filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.') && !ignoredSet.has(entry.name)
    )

    await Promise.all(subDirs.map((entry) => scanDir(path.join(dirPath, entry.name), depth + 1)))
  }

  if (onLog) onLog(`Starting scan in ${rootPath}`)
  await scanDir(rootPath)
  if (onLog) onLog(`Scan complete. Found ${projectsMap.size} projects.`)

  return Array.from(projectsMap.values()).sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  )
}
