export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'unknown'

export interface Project {
  id: string
  name: string
  path: string
  type: ProjectType
  version: string | null
  scripts: Record<string, string>
  runnerCommand?: string
  dependencies: number
  devDependencies: number
  lastModified: Date
  git: {
    branch: string | null
    status: 'clean' | 'modified'
    ahead: number
    behind: number
    dirty: boolean
  } | null
  isFavorite?: boolean
  installCommand?: string
}
