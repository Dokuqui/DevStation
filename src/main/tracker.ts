/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow } from 'electron'
import { getActiveTerminalIds } from './terminal'
import path from 'path'

interface TimeStore {
  projectTimes: Record<string, number>
}

interface TrackedProject {
  id: string
  name: string
}

let store: any = null
let knownProjects: TrackedProject[] = []
const externalProcesses = new Map<number, string>()

export function updateKnownProjects(projects: TrackedProject[]): void {
  knownProjects = projects
}

export function registerExternalProcess(pid: number, projectId: string): void {
  externalProcesses.set(pid, projectId)
}

async function getStore(): Promise<any> {
  if (store) return store
  const { default: Store } = await import('electron-store')
  store = new Store<TimeStore>({
    defaults: {
      projectTimes: {}
    }
  })
  return store
}

let interval: NodeJS.Timeout | null = null

export function startTimeTracker(mainWindow: BrowserWindow): void {
  if (interval) clearInterval(interval)

  getStore().catch((err) => console.error('[Tracker] Failed to init store:', err))

  interval = setInterval(async () => {
    const s = await getStore()
    const activeProjectIds = new Set<string>()

    const runningTermIds = getActiveTerminalIds()
    runningTermIds.forEach((termId) => {
      if (!termId) return

      const firstDashIndex = termId.indexOf('-')
      if (firstDashIndex > 0) {
        const projectId = termId.substring(0, firstDashIndex)
        activeProjectIds.add(projectId)
      }
    })

    for (const [pid, projectId] of externalProcesses.entries()) {
      try {
        process.kill(pid, 0)
        activeProjectIds.add(projectId)
      } catch {
        externalProcesses.delete(pid)
      }
    }

    try {
      const { default: activeWin } = await import('active-win')
      const win = await activeWin()

      if (win?.title) {
        const titleLower = win.title.toLowerCase()
        const match = knownProjects.find(
          (p) =>
            titleLower.includes(p.name.toLowerCase()) ||
            titleLower.includes(path.basename(p.id).toLowerCase())
        )

        if (match) {
          activeProjectIds.add(match.id)
        }
      }
    } catch {
      // Ignore active-win errors
    }

    if (activeProjectIds.size === 0) return

    const currentTimes = { ...s.get('projectTimes') }
    const updates: Record<string, number> = {}

    activeProjectIds.forEach((projectId) => {
      const newTime = (currentTimes[projectId] || 0) + 1
      currentTimes[projectId] = newTime
      updates[projectId] = newTime
    })

    s.set('projectTimes', currentTimes)

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('time:update', updates)
    }
  }, 1000)
}

export async function getProjectTimes(): Promise<Record<string, number>> {
  const s = await getStore()
  return s.get('projectTimes')
}
