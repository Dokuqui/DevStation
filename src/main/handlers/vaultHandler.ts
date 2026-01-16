import { ipcMain } from 'electron'
import { vaultService } from '../services/vaultService'

export function registerVaultHandlers(): void {
  ipcMain.handle('vault:get-env', async (_, projectPath: string) => {
    return vaultService.getEnvFile(projectPath)
  })

  ipcMain.handle(
    'vault:save-env',
    async (_, { path, content }: { path: string; content: string }) => {
      return vaultService.saveEnvFile(path, content)
    }
  )

  ipcMain.handle('vault:get-secrets', async () => {
    return vaultService.getSecrets()
  })

  ipcMain.handle('vault:add-secret', async (_, { label, value, category }) => {
    return vaultService.addSecret(label, value, category)
  })

  ipcMain.handle('vault:reveal-secret', async (_, id: string) => {
    return vaultService.revealSecret(id)
  })

  ipcMain.handle('vault:delete-secret', async (_, id: string) => {
    return vaultService.deleteSecret(id)
  })
}
