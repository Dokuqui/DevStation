import { ipcMain, BrowserWindow } from 'electron'
import {
  killProcessByName,
  restartDocker,
  startDocker,
  stopDocker,
  dockerPrune,
  dockerComposeUp,
  dockerComposeDown
} from '../commands'
import { runWorkflow } from '../workflows/engine'

export function registerCommandHandlers(): void {
  ipcMain.handle('commands:kill-process', async (_event, name: string) => {
    return await killProcessByName(name)
  })

  ipcMain.handle('commands:restart-docker', async () => {
    return await restartDocker()
  })

  ipcMain.handle('commands:docker-start', () => startDocker())

  ipcMain.handle('commands:docker-stop', () => stopDocker())

  ipcMain.handle('commands:docker-prune', () => dockerPrune())

  ipcMain.handle('commands:docker-compose-up', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const url = win?.webContents.getURL()
    const cwd = url?.includes('file://') ? process.cwd() : process.cwd()
    return await dockerComposeUp(cwd)
  })

  ipcMain.handle('commands:docker-compose-down', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const url = win?.webContents.getURL()
    const cwd = url?.includes('file://') ? process.cwd() : process.cwd()
    return await dockerComposeDown(cwd)
  })

  ipcMain.handle('commands:run-workflow', async (_event, workflowJson) => {
    runWorkflow(workflowJson)
    return 'Workflow started'
  })
}
