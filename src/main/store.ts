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
  }
  github_token?: string
}

let storeInstance: any

export const getStore = async (): Promise<any> => {
  if (storeInstance) return storeInstance

  const { default: Store } = await import('electron-store')

  storeInstance = new Store<StoreSchema>({
    defaults: {
      workflows: [],
      settings: {
        defaultPath: app.getPath('home'),
        theme: 'dark',
        terminalShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh',
        terminalFontSize: 14,
        confirmKill: true
      }
    }
  })

  return storeInstance
}
