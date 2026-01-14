import { Workflow, WorkflowNode, WorkflowEdge } from '../../shared/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import { BrowserWindow, Notification } from 'electron'

const execAsync = promisify(exec)

function getNextNodes(
  currentId: string,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[],
  activeHandleId?: string
): WorkflowNode[] {
  const outgoingEdges = edges.filter((e) => e.source === currentId)

  const activeEdges = activeHandleId
    ? outgoingEdges.filter((e) => e.sourceHandle === activeHandleId)
    : outgoingEdges

  const targetIds = activeEdges.map((e) => e.target)
  return nodes.filter((n) => targetIds.includes(n.id))
}

interface ExecutionResult {
  success: boolean
  output?: string
  nextHandle?: string
}

async function executeNode(node: WorkflowNode, prevOutput: string = ''): Promise<ExecutionResult> {
  const { type, command, label, message, duration, url, method, body, operator, comparisonValue } =
    node.data

  console.log(`[Workflow] Step: ${label} (${type})`)

  switch (type) {
    case 'shell':
    case 'script': {
      if (!command) return { success: false }

      let finalCommand = command as string
      if (prevOutput) {
        finalCommand = finalCommand.replace(/{{input}}/g, prevOutput)
      }

      console.log(`[Executing] ${finalCommand}`)

      try {
        const { stdout } = await execAsync(finalCommand)
        return { success: true, output: stdout.trim() }
      } catch (error) {
        console.error(`[Error] Command failed: ${finalCommand}`, error)
        throw error
      }
    }

    case 'delay': {
      const ms = Number(duration) || 1000
      console.log(`[Delay] Waiting ${ms}ms...`)
      await new Promise((resolve) => setTimeout(resolve, ms))
      return { success: true, output: prevOutput }
    }

    case 'http':
      if (!url) throw new Error('No URL provided for HTTP request')
      try {
        console.log(`[HTTP] ${method || 'GET'} ${url}`)

        const fetchOpts: RequestInit = {
          method: (method as string) || 'GET',
          headers: { 'Content-Type': 'application/json' }
        }

        if (method !== 'GET' && method !== 'HEAD' && body) {
          fetchOpts.body = body as string
        }

        const res = await fetch(url as string, fetchOpts)
        const text = await res.text()
        return { success: res.ok, output: text }
      } catch (error) {
        console.error('[HTTP Failed]', error)
        throw error
      }

    case 'condition': {
      let isMatch = false
      const val = prevOutput || ''
      const target = (comparisonValue as string) || ''

      if (operator === 'contains') isMatch = val.includes(target)
      else if (operator === 'equals') isMatch = val === target
      else if (operator === 'gt') isMatch = Number(val) > Number(target)

      console.log(`[Condition] "${val}" ${operator} "${target}"? -> ${isMatch}`)

      return {
        success: true,
        output: prevOutput,
        nextHandle: isMatch ? 'true' : 'false'
      }
    }

    case 'notify': {
      {
        const toastType = (node.data.notificationType as string) || 'info'
        const msg = (message as string) || `Workflow step "${label}" completed`
        const isNative = node.data.native === true

        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          win.webContents.send('toast:show', {
            message: msg,
            type: toastType
          })
        }

        if (isNative) {
          new Notification({
            title: 'DevStation',
            body: msg
          }).show()
        }

        return { success: true, output: prevOutput }
      }
    }

    case 'log':
      console.log(`[User Log] ${message} | Prev Output: ${prevOutput}`)
      return { success: true, output: prevOutput }

    default:
      console.warn(`Unknown action type: ${type}`)
      return { success: true }
  }
}

export async function runWorkflow(workflow: Workflow, startNodeId?: string): Promise<void> {
  console.log(`[Workflow] Starting: ${workflow.name}`)

  let currentBatch: WorkflowNode[] = []
  if (startNodeId) {
    const node = workflow.nodes.find((n) => n.id === startNodeId)
    if (node) currentBatch = [node]
  } else {
    const targetIds = new Set(workflow.edges.map((e) => e.target))
    currentBatch = workflow.nodes.filter((n) => !targetIds.has(n.id))
  }

  const queue: { node: WorkflowNode; input: string }[] = currentBatch.map((n) => ({
    node: n,
    input: ''
  }))

  while (queue.length > 0) {
    const { node, input } = queue.shift()!

    if (node.type === 'trigger') {
      const next = getNextNodes(node.id, workflow.edges, workflow.nodes)
      next.forEach((n) => queue.push({ node: n, input: '' }))
      continue
    }

    try {
      const result = await executeNode(node, input)

      const nextNodes = getNextNodes(node.id, workflow.edges, workflow.nodes, result.nextHandle)

      nextNodes.forEach((n) => queue.push({ node: n, input: result.output || '' }))
    } catch {
      console.error(`Workflow stopped at node ${node.id} due to error.`)
      new Notification({
        title: 'Workflow Failed',
        body: `Step "${node.data.label}" failed.`
      }).show()
      break
    }
  }

  console.log(`[Workflow] Finished: ${workflow.name}`)
}
