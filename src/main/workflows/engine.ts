import { Workflow, WorkflowNode } from '@renderer/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Notification } from 'electron'

const execAsync = promisify(exec)

function getNextNodes(currentId: string, workflow: Workflow): WorkflowNode[] {
  const outgoingEdges = workflow.edges.filter((e) => e.source === currentId)
  const targetIds = outgoingEdges.map((e) => e.target)
  return workflow.nodes.filter((n) => targetIds.includes(n.id))
}

async function executeNode(node: WorkflowNode): Promise<void> {
  const { type, command, label, message } = node.data

  console.log(`[Workflow] Executing Step: ${label} (${type})`)

  switch (type) {
    case 'shell':
    case 'script':
      if (command) {
        try {
          const { stdout } = await execAsync(command as string)
          console.log(`[Output] ${stdout}`)
        } catch (error) {
          console.error(`[Error] Command failed: ${command}`, error)
          throw error
        }
      }
      break

    case 'log':
      console.log(`[Log Action] ${label}`)
      break

    case 'notify':
      new Notification({
        title: 'DevStation Automation',
        body: (message as string) || 'Workflow action triggered'
      }).show()
      break

    default:
      console.warn(`Unknown action type: ${type}`)
  }
}

export async function runWorkflow(workflow: Workflow, startNodeId?: string): Promise<void> {
  console.log(`[Workflow] Starting: ${workflow.name}`)

  let currentNodes: WorkflowNode[] = []

  if (startNodeId) {
    const node = workflow.nodes.find((n) => n.id === startNodeId)
    if (node) currentNodes = [node]
  } else {
    const targetIds = new Set(workflow.edges.map((e) => e.target))
    currentNodes = workflow.nodes.filter((n) => !targetIds.has(n.id))
  }

  const queue = [...currentNodes]

  while (queue.length > 0) {
    const node = queue.shift()!

    if (node.type !== 'trigger') {
      await executeNode(node)
    }

    const nextNodes = getNextNodes(node.id, workflow)
    queue.push(...nextNodes)
  }

  console.log(`[Workflow] Finished: ${workflow.name}`)
}
