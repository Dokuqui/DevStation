import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { Project } from '../shared/types'

import { NodeDetector } from './detectors/node'
import { PythonDetector } from './detectors/python'
import { RustDetector } from './detectors/rust'
import { GoDetector } from './detectors/go'

const DETECTORS = [NodeDetector, RustDetector, PythonDetector, GoDetector]

export async function scanProjects(rootPath: string): Promise<Project[]> {
  const projects: Project[] = []
  let entries

  try {
    entries = await fs.readdir(rootPath, { withFileTypes: true })
  } catch (e) {
    console.error(e)
    return []
  }

  const checkFolder = async (folderPath: string): Promise<Project | null> => {
    for (const detector of DETECTORS) {
      const isMatch = await detector.isMatch(folderPath)
      if (isMatch) {
        const details = await detector.parse(folderPath)

        return {
          id: randomUUID(),
          path: folderPath,
          isFavorite: false,
          ...details
        } as Project
      }
    }
    return null
  }

  const rootProject = await checkFolder(rootPath)
  if (rootProject) projects.push(rootProject)

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const fullPath = path.join(rootPath, entry.name)
      const project = await checkFolder(fullPath)
      if (project) projects.push(project)
    }
  }

  return projects
}
