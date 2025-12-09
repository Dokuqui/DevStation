import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      ping: () => Promise<string>
      selectFolder: () => Promise<string | null>
      scanProjects: (path: string) => Promise<Project[]>
      createTerminal: (
        id: string,
        cwd: string,
        command: string
      ) => Promise<{ success: boolean; pid?: number; error?: string }>
      writeTerminal: (id: string, data: string) => void
      resizeTerminal: (id: string, cols: number, rows: number) => void
      killTerminal: (id: string) => Promise<boolean>
      onTerminalData: (id: string, callback: (data: string) => void) => () => void
      onTerminalExit: (id: string, callback: () => void) => () => void
    }
  }
}
