import { ipcMain, BrowserWindow } from 'electron'
import { getStore } from '../store'

export function registerSettingHandlers(): void {
  ipcMain.handle('settings:get', async (_event, key) => {
    const store = await getStore()
    const settings = store.get('settings')
    return key ? settings[key] : settings
  })

  ipcMain.handle('settings:set', async (event, key, value) => {
    const store = await getStore()
    const settings = store.get('settings')

    settings[key] = value
    store.set('settings', settings)

    if (key === 'theme') {
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.webContents.send('theme:changed', value)
    }

    return true
  })
}
