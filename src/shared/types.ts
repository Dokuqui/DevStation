export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'unknown'

export interface Project {
  id: string
  name: string
  version: string
  path: string
  type: ProjectType

  scripts: Record<string, string>

  runnerCommand?: string

  isFavorite?: boolean
}
