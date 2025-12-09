import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { Project } from '../shared/types'

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  scanProjects: (path: string): Promise<Project[]> => ipcRenderer.invoke('projects:scan', path),
  createTerminal: (id: string, cwd: string, command: string) =>
    ipcRenderer.invoke('terminal:create', id, cwd, command),

  writeTerminal: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),

  resizeTerminal: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', id, cols, rows),

  killTerminal: (id: string) => ipcRenderer.invoke('terminal:kill', id),

  onTerminalData: (id: string, callback: (data: string) => void) => {
    const channel = `terminal:incoming:${id}`
    const listener = (_: IpcRendererEvent, data: string): void => callback(data)
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
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
