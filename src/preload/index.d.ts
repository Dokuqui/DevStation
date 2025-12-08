import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      ping: () => Promise<string>
      selectFolder: () => Promise<string | null>
      scanProjects: (path: string) => Promise<Project[]>
    }
  }
}
