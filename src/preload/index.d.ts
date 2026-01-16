import '@electron-toolkit/preload'

import { Project, IDE, SystemStats } from '@renderer/types'

declare global {
  interface Window {
    electron: import('@electron-toolkit/preload').ElectronAPI

    api: {
      selectFolder: () => Promise<string | null>

      scanProjects: (path: string) => Promise<Project[]>

      getAvailableIDEs: () => Promise<IDE[]>

      openProjectInIDE: (ideId: IDE, path: string) => Promise<void>

      selectCustomIDE: () => Promise<{ name: string; path: string } | null>

      openInVSCode: (path: string) => Promise<void>

      openSystemTerminal: (path: string) => Promise<void>

      createTerminal: (
        id: string,
        cwd: string,
        command: string
      ) => Promise<{ success: true; pid: number } | { success: false; error: string }>

      writeTerminal: (id: string, data: string) => void

      resizeTerminal: (id: string, cols: number, rows: number) => void

      killTerminal: (id: string) => Promise<boolean>

      onTerminalData: (id: string, callback: (data: string) => void) => () => void

      onTerminalExit: (id: string, callback: (code: number | null) => void) => () => void

      getProjectTimes: () => Promise<Record<string, number>>

      onTimeUpdate: (callback: (times: Record<string, number>) => void) => () => void

      onScanLog: (callback: (msg: string) => void) => () => void

      onSystemUpdate: (callback: (stats: SystemStats) => void) => () => void

      killProcess: (name: string) => Promise<string>

      restartDocker: () => Promise<string>

      startDocker: () => Promise<string>

      stopDocker: () => Promise<string>

      dockerPrune: () => Promise<string>

      dockerComposeUp: () => Promise<string>

      dockerComposeDown: () => Promise<string>

      saveWorkflow: (workflow: Workflow) => Promise<void>

      executeWorkflow: (workflow: Workflow) => Promise<void>

      deleteWorkflow: (id: string) => Promise<void>

      stopAllWorkflows: () => Promise<void>

      getAllWorkflows: () => Promise<Workflow[]>

      onSnippetUpdate: (callback: (data: { id: string; content: string }) => void) => () => void

      onShowToast: (
        callback: (message: string, type: 'success' | 'error' | 'info') => void
      ) => () => void

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runWorkflow: (workflow: any) => Promise<string>

      updateTheme: (theme: 'dark' | 'light') => Promise<void>

      gitClone: (url: string, parentPath: string, shallow: boolean) => Promise<string>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gitStatus: (path: string) => Promise<any>

      gitPull: (path: string) => Promise<void>

      gitPush: (path: string) => Promise<void>

      gitFetch: (path: string) => Promise<void>

      gitCheckout: (path: string, branch: string) => Promise<void>

      gitCommit: (path: string, message: string) => Promise<void>

      gitStash: (path: string) => Promise<void>

      githubLogin: () => Promise<boolean>

      githubLogout: () => Promise<boolean>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      githubRepos: () => Promise<any[]>

      githubStatus: () => Promise<boolean>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSettings: (key?: string) => Promise<any>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSetting: (key: string, value: any) => Promise<boolean>
    }
  }
}

export {}
