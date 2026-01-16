import { Workflow } from '@renderer/types'
import { ipcMain } from 'electron'
import { getStore } from '../services/store'
import { runWorkflow } from '../workflows/engine'
import { registerWorkflow, unregisterWorkflow, stopAllWorkflows } from '../workflows/scheduler'

export function registerWorkflowHandlers(): void {
  ipcMain.handle('workflow:save', async (_event, workflow: Workflow) => {
    const store = await getStore()
    const currentWorkflows = (store.get('workflows') as Workflow[]) || []

    const index = currentWorkflows.findIndex((w) => w.id === workflow.id)
    let newWorkflows

    if (index !== -1) {
      newWorkflows = [...currentWorkflows]
      newWorkflows[index] = workflow
    } else {
      newWorkflows = [...currentWorkflows, workflow]
    }

    store.set('workflows', newWorkflows)
    registerWorkflow(workflow)
    return { success: true }
  })

  ipcMain.handle('workflow:get-all', async () => {
    const store = await getStore()
    return store.get('workflows') || []
  })

  ipcMain.handle('workflow:execute', (_event, workflow: Workflow) => {
    runWorkflow(workflow)
  })

  ipcMain.handle('workflow:delete', async (_event, workflowId: string) => {
    unregisterWorkflow(workflowId)

    const store = await getStore()
    const current = (store.get('workflows') as Workflow[]) || []
    const filtered = current.filter((w) => w.id !== workflowId)

    store.set('workflows', filtered)
    return { success: true }
  })

  ipcMain.handle('workflow:stop-all', () => {
    stopAllWorkflows()
    return { success: true }
  })
}
