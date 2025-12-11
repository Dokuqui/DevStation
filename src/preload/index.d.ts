import '@electron-toolkit/preload'

import type { IDE, Project } from '../shared/types'

declare global {
  interface Window {
    electron: import('@electron-toolkit/preload').ElectronAPI

    api: {
      selectFolder: () => Promise<string | null>

      scanProjects: (path: string) => Promise<Project[]>

      getAvailableIDEs: () => Promise<IDE[]>
      openProjectInIDE: (ideId: IDE, path: string) => Promise<void>

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
    }
  }
}

export {}
