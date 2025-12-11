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

export interface DiskDetail {
  fs: string
  mount: string
  type: string
  size: number
  used: number
  use: number
}

export interface NetDetail {
  iface: string
  rx_sec: number
  tx_sec: number
}

export interface SystemStats {
  cpu: {
    global: number
    cores: number[]
  }
  mem: {
    total: number
    used: number
    active: number
    swapTotal: number
    swapUsed: number
  }
  disk: {
    main: DiskDetail
    all: DiskDetail[]
  }
  net: {
    total: { up: number; down: number }
    interfaces: NetDetail[]
  }
}
