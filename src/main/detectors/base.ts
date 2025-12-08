import { Project } from '../../shared/types'

export interface ProjectDetector {
  isMatch(folderPath: string): Promise<boolean>

  parse(folderPath: string): Promise<Partial<Project>>
}
