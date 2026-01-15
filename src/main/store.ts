/* eslint-disable @typescript-eslint/no-explicit-any */
import { app } from 'electron'

interface StoreSchema {
  workflows: any[]
  settings: {
    defaultPath: string
    theme: string
    terminalShell: string
    confirmKill: boolean
    terminalFontSize?: number
    ignoredFolders: string
  }
  github_token?: string
  projectTimes: Record<string, number>
  customIDE: { name: string; path: string } | null
}

let storeInstance: any

export const getStore = async (): Promise<any> => {
  if (storeInstance) return storeInstance

  const { default: Store } = await import('electron-store')

  storeInstance = new Store<StoreSchema>({
    defaults: {
      workflows: [],
      projectTimes: {},
      customIDE: null,
      settings: {
        defaultPath: app.getPath('home'),
        theme: 'dark',
        terminalShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh',
        terminalFontSize: 14,
        confirmKill: true,
        ignoredFolders: 'node_modules,dist,build,target,vendor,.git'
      }
    }
  })

  return storeInstance
}
