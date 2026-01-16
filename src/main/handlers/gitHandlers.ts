import { ipcMain } from 'electron'
import {
  cloneRepository,
  getGitStatus,
  gitCheckout,
  gitCommit,
  gitFetch,
  gitPull,
  gitPush,
  gitStash
} from '../services/git'
import { loginWithGitHub, getGitHubRepos, isGitHubLoggedIn, logoutGitHub } from '../services/github'

export function registerGitHandlers(): void {
  ipcMain.handle('git:clone', async (_event, { url, parentPath, shallow }) => {
    return await cloneRepository(url, parentPath, shallow)
  })

  ipcMain.handle('git:status', async (_event, path: string) => {
    return await getGitStatus(path)
  })

  ipcMain.handle('git:pull', async (_event, path: string) => {
    return await gitPull(path)
  })

  ipcMain.handle('git:push', async (_event, path: string) => {
    return await gitPush(path)
  })

  ipcMain.handle('git:checkout', async (_event, { path, branch }) => {
    return await gitCheckout(path, branch)
  })

  ipcMain.handle('git:fetch', async (_event, path: string) => {
    return await gitFetch(path)
  })

  ipcMain.handle('git:commit', async (_event, { path, message }) => {
    return await gitCommit(path, message)
  })

  ipcMain.handle('git:stash', async (_event, path: string) => {
    return await gitStash(path)
  })

  ipcMain.handle('github:login', async () => {
    return await loginWithGitHub()
  })

  ipcMain.handle('github:repos', async () => {
    return await getGitHubRepos()
  })

  ipcMain.handle('github:status', () => {
    return isGitHubLoggedIn()
  })

  ipcMain.handle('github:logout', () => {
    return logoutGitHub()
  })
}
