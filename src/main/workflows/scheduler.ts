import cron from 'node-cron'
import chokidar from 'chokidar'
import { Workflow } from '../../shared/types'
import { runWorkflow } from './engine'
import { monitorEvents } from '../monitor'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeTasks: Record<string, any[]> = {}

const triggerCooldowns: Record<string, number> = {}

export function registerWorkflow(workflow: Workflow): void {
  unregisterWorkflow(workflow.id)

  if (!workflow.active) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks: any[] = []

  const triggers = workflow.nodes.filter((n) => n.type === 'trigger')

  triggers.forEach((trigger) => {
    const { type, cron: cronExpression, path, condition, threshold } = trigger.data

    if (type === 'schedule' && typeof cronExpression === 'string') {
      if (cron.validate(cronExpression)) {
        console.log(`[Scheduler] Registered Cron for ${workflow.name}: ${cronExpression}`)
        const task = cron.schedule(cronExpression, () => {
          runWorkflow(workflow, trigger.id)
        })
        tasks.push(task)
      } else {
        console.warn(
          `[Scheduler] Skipped invalid Cron for ${workflow.name}: "${cronExpression}" (Expected format: "* * * * *")`
        )
      }
    }

    if (type === 'file-change' && path) {
      console.log(`[Scheduler] Watching files for ${workflow.name}: ${path}`)
      const watcher = chokidar.watch(path as string, { ignoreInitial: true })

      watcher.on('all', (event, filePath) => {
        console.log(`[File Watcher] ${event} detected at ${filePath}`)
        runWorkflow(workflow, trigger.id)
      })

      tasks.push(watcher)
    }

    if (type === 'app-start') {
      setTimeout(() => runWorkflow(workflow, trigger.id), 1000)
    }

    if (type === 'system-event' && condition && threshold) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkStats = (stats: any): void => {
        const now = Date.now()
        if (triggerCooldowns[trigger.id] && now - triggerCooldowns[trigger.id] < 60000) {
          return
        }

        let triggered = false
        if (condition === 'cpu' && stats.cpu > Number(threshold)) triggered = true
        if (condition === 'mem' && (stats.mem.active / stats.mem.total) * 100 > Number(threshold))
          triggered = true

        if (triggered) {
          console.log(`[Scheduler] System Trigger: ${condition} > ${threshold}%`)
          triggerCooldowns[trigger.id] = now
          runWorkflow(workflow, trigger.id)
        }
      }

      monitorEvents.on('stats', checkStats)
      tasks.push({ stop: () => monitorEvents.off('stats', checkStats) })
    }
  })

  activeTasks[workflow.id] = tasks
}

export function unregisterWorkflow(workflowId: string): void {
  const tasks = activeTasks[workflowId] || []

  tasks.forEach((task) => {
    if (task.stop) task.stop()
    if (task.close) task.close()
  })

  delete activeTasks[workflowId]
}

export function registerAllWorkflows(workflows: Workflow[]): void {
  workflows.forEach(registerWorkflow)
}

export function stopAllWorkflows(): void {
  Object.keys(activeTasks).forEach((id) => {
    unregisterWorkflow(id)
  })
  console.log('[Scheduler] All workflows stopped.')
}
