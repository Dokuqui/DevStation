import fs from 'fs/promises'
import path from 'path'
import { Project } from '@renderer/types'

export interface ProjectDetector {
  isMatch(folderPath: string): Promise<boolean>

  parse(folderPath: string): Promise<Partial<Project>>
}

export abstract class BaseDetector implements ProjectDetector {
  abstract isMatch(folderPath: string): Promise<boolean>
  abstract parse(folderPath: string): Promise<Partial<Project>>

  protected async fileExists(folderPath: string, fileName: string): Promise<boolean> {
    try {
      await fs.access(path.join(folderPath, fileName))
      return true
    } catch {
      return false
    }
  }

  protected async readFile(folderPath: string, fileName: string): Promise<string> {
    try {
      return await fs.readFile(path.join(folderPath, fileName), 'utf-8')
    } catch {
      return ''
    }
  }

  protected async anyFileExists(folderPath: string, files: string[]): Promise<boolean> {
    for (const file of files) {
      if (await this.fileExists(folderPath, file)) return true
    }
    return false
  }
}
