import { contextBridge, ipcRenderer } from 'electron'
import { Project } from '../shared/types'

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  scanProjects: (path: string): Promise<Project[]> => ipcRenderer.invoke('projects:scan', path)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.api = api
}
