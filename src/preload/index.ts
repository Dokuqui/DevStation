import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { Project, IDE, SystemStats } from '@renderer/types'

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),

  scanProjects: (path: string): Promise<Project[]> => ipcRenderer.invoke('projects:scan', path),

  createTerminal: (id: string, cwd: string, command: string) =>
    ipcRenderer.invoke('terminal', 'create', { id, cwd, command }),

  writeTerminal: (id: string, data: string) =>
    ipcRenderer.invoke('terminal', 'write', { id, data }),

  resizeTerminal: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal', 'resize', { id, cols, rows }),

  killTerminal: (id: string) => ipcRenderer.invoke('terminal', 'kill', { id }),

  onTerminalData: (id: string, callback: (data: string) => void) => {
    const channel = `terminal:incoming:${id}`
    const listener = (_event: IpcRendererEvent, data: string): void => callback(data)

    ipcRenderer.on(channel, listener)

    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  onTerminalExit: (id: string, callback: (code: number | null) => void) => {
    const channel = `terminal:exit:${id}`
    const listener = (_event: IpcRendererEvent, code: number | null): void => callback(code)

    ipcRenderer.on(channel, listener)

    return () => ipcRenderer.removeListener(channel, listener)
  },

  getAvailableIDEs: (): Promise<IDE[]> => ipcRenderer.invoke('ide:detect'),

  openProjectInIDE: (ideId: IDE, path: string): Promise<void> =>
    ipcRenderer.invoke('ide:open', { ideId, path }),

  selectCustomIDE: (): Promise<{ name: string; path: string } | null> =>
    ipcRenderer.invoke('ide:select-custom'),

  openInVSCode: (path: string) => ipcRenderer.invoke('project:open-vscode', path),

  openSystemTerminal: (path: string) => ipcRenderer.invoke('project:open-terminal', path),

  getProjectTimes: (): Promise<Record<string, number>> => ipcRenderer.invoke('time:get-all'),

  onTimeUpdate: (callback: (times: Record<string, number>) => void) => {
    const listener = (_event: IpcRendererEvent, times: Record<string, number>): void =>
      callback(times)
    ipcRenderer.on('time:update', listener)
    return () => ipcRenderer.removeListener('time:update', listener)
  },

  onScanLog: (callback: (msg: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (_event: any, msg: string): void => callback(msg)
    ipcRenderer.on('scan:log', listener)
    return () => ipcRenderer.removeListener('scan:log', listener)
  },

  onSystemUpdate: (callback: (stats: SystemStats) => void) => {
    const listener = (_event: IpcRendererEvent, stats: SystemStats): void => callback(stats)
    ipcRenderer.on('system:update', listener)
    return () => ipcRenderer.removeListener('system:update', listener)
  },

  killProcess: (name: string) => ipcRenderer.invoke('commands:kill-process', name),

  restartDocker: () => ipcRenderer.invoke('docker:restart'),

  startDocker: () => ipcRenderer.invoke('docker:start'),

  stopDocker: () => ipcRenderer.invoke('docker:stop'),

  dockerComposeUp: () => ipcRenderer.invoke('commands:docker-compose-up'),

  dockerComposeDown: () => ipcRenderer.invoke('commands:docker-compose-down'),

  dockerPrune: () => ipcRenderer.invoke('docker:prune')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API via contextBridge:', error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.api = api
}
