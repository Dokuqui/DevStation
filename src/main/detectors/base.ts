import { Project } from '@renderer/types'

export interface ProjectDetector {
  isMatch(folderPath: string): Promise<boolean>

  parse(folderPath: string): Promise<Partial<Project>>
}
