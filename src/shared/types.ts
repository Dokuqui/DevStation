export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'csharp' | 'unknown'
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

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string
  type: string

  command?: string
  cron?: string
  path?: string
  message?: string

  duration?: number

  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
  body?: string
  headers?: string
  notificationType?: 'success' | 'error' | 'info'

  variable?: string
  operator?: 'contains' | 'equals' | 'gt' | 'lt'
  comparisonValue?: string
}

export interface WorkflowNode {
  id: string
  type: string
  data: WorkflowNodeData
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  active: boolean
}

export type SnippetType = 'code' | 'note'

export interface Snippet {
  id: string
  title: string
  content: string
  type: SnippetType
  folderId?: string | null
  linkedProjectIds?: string[]
  linkedWorkflowIds?: string[]
  language: string
  tags: string[]
  createdAt: number
  updatedAt: number
  favorite: boolean
}
