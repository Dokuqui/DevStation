export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'unknown'
export type IDE =
  | 'vscode'
  | 'pycharm'
  | 'intellij'
  | 'webstorm'
  | 'goland'
  | 'rustrover'
  | 'sublime'
  | 'rider'
  | 'custom'

export interface GitInfo {
  branch: string | null
  isClean: boolean
  filesChanged: number
  ahead: number
  behind: number
  lastCommitMessage: string | null
  lastCommitDate: Date | null
  lastCommitAuthor: string | null
}

export interface Project {
  id: string
  name: string
  path: string
  type: ProjectType
  version: string | null
  scripts: Record<string, string>
  runnerCommand?: string
  installCommand?: string
  dependencies: number
  devDependencies: number
  lastModified: Date
  git: GitInfo | null
  isFavorite?: boolean
}

export interface AvailableIDE {
  id: IDE
  name: string
  path?: string
}
