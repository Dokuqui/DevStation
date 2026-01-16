import { Workflow, WorkflowNode, WorkflowEdge } from '../../shared/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import { BrowserWindow, Notification } from 'electron'
import vm from 'vm'

const execAsync = promisify(exec)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExecutionContext = Record<string, any>

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

function replaceVariables(text: string, input: string, context: ExecutionContext): string {
  let result = text.replace(/{{input}}/g, input || '')

  result = result.replace(/\{\{\s*\$([a-zA-Z0-9_]+)\s*\}\}/g, (_, varName) => {
    return context[varName] !== undefined ? String(context[varName]) : ''
  })

  return result
}

async function executeNode(
  node: WorkflowNode,
  prevOutput: string = '',
  context: ExecutionContext
): Promise<ExecutionResult> {
  const {
    type,
    command,
    label,
    message,
    duration,
    url,
    method,
    body,
    operator,
    comparisonValue,
    snippetId,
    code,
    mode,
    outputVar,
    writeInput
  } = node.data

  console.log(`[Workflow] Step: ${label} (${type})`)

  switch (type) {
    case 'snippet': {
      if (!code && mode !== 'write') return { success: false, output: 'No code content' }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = ''

      if (mode === 'read') {
        result = code
      } else if (mode === 'write') {
        const contentToWrite = writeInput
          ? replaceVariables(writeInput as string, prevOutput, context)
          : prevOutput

        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          win.webContents.send('workflow:update-snippet', {
            id: snippetId,
            content: contentToWrite
          })
        }
        result = `Updated snippet ${snippetId}`
      } else {
        try {
          const sandbox = {
            console: { log: () => {} },
            input: prevOutput,
            ...context
          }
          vm.createContext(sandbox)

          const script = `(async () => { ${code} \n})()`
          result = await vm.runInContext(script, sandbox)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          console.error('[Snippet Error]', e)
          throw new Error(`Snippet execution failed: ${e.message}`)
        }
      }

      if (outputVar && typeof outputVar === 'string') {
        context[outputVar] = result
        console.log(`[Var] Stored result in $${outputVar}`)
      }

      return {
        success: true,
        output: typeof result === 'object' ? JSON.stringify(result) : String(result)
      }
    }
    case 'shell':
    case 'script': {
      if (!command) return { success: false }

      const finalCommand = replaceVariables(command as string, prevOutput, context)

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
        const finalUrl = replaceVariables(url as string, prevOutput, context)
        const finalBody = body ? replaceVariables(body as string, prevOutput, context) : undefined

        console.log(`[HTTP] ${method || 'GET'} ${finalUrl}`)

        const fetchOpts: RequestInit = {
          method: (method as string) || 'GET',
          headers: { 'Content-Type': 'application/json' }
        }

        if (method !== 'GET' && method !== 'HEAD' && finalBody) {
          fetchOpts.body = finalBody
        }

        const res = await fetch(finalUrl, fetchOpts)
        const text = await res.text()
        return { success: res.ok, output: text }
      } catch (error) {
        console.error('[HTTP Failed]', error)
        throw error
      }

    case 'condition': {
      let isMatch = false
      const val = prevOutput || ''

      const rawTarget = (comparisonValue as string) || ''
      const target = replaceVariables(rawTarget, prevOutput, context)

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
        const rawMsg = (message as string) || `Workflow step "${label}" completed`
        const msg = replaceVariables(rawMsg, prevOutput, context)
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
  const executionContext: ExecutionContext = {}

  let currentBatch: WorkflowNode[] = []
  if (startNodeId) {
    const node = workflow.nodes.find((n) => n.id === startNodeId)
    if (node) currentBatch = [node]
  } else {
    const targetIds = new Set(workflow.edges.map((e) => e.target))
    currentBatch = workflow.nodes.filter((n) => !targetIds.has(n.id) || n.type === 'trigger')
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
      const result = await executeNode(node, input, executionContext)

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
