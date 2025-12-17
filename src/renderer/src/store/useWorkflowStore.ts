import { create } from 'zustand'
import {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection
} from '@xyflow/react'

export interface Workflow {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  active: boolean
}

interface WorkflowState {
  workflows: Workflow[]
  activeWorkflowId: string | null
  nodes: Node[]
  edges: Edge[]

  setWorkflows: (workflows: Workflow[]) => void
  selectWorkflow: (id: string) => void
  createWorkflow: (name: string) => void
  saveWorkflow: () => Promise<void>
  deleteWorkflow: (id: string) => void
  deactivateAll: () => void
  closeEditor: () => void

  runWorkflow: (id: string) => Promise<void>
  toggleWorkflow: (id: string) => Promise<void>

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateNodeData: (nodeId: string, newData: Record<string, any>) => void
  loadWorkflows: () => Promise<void>
  updateWorkflowName: (name: string) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  nodes: [],
  edges: [],

  setWorkflows: (workflows) => set({ workflows }),

  createWorkflow: (name) => {
    const newWorkflow: Workflow = {
      id: crypto.randomUUID(),
      name,
      nodes: [],
      edges: [],
      active: false
    }
    set((state) => ({
      workflows: [...state.workflows, newWorkflow],
      activeWorkflowId: newWorkflow.id,
      nodes: [],
      edges: []
    }))
  },

  selectWorkflow: (id) => {
    const wf = get().workflows.find((w) => w.id === id)
    if (wf) {
      set({
        activeWorkflowId: id,
        nodes: wf.nodes || [],
        edges: wf.edges || []
      })
    }
  },

  saveWorkflow: async () => {
    const { activeWorkflowId, nodes, edges, workflows } = get()
    if (!activeWorkflowId) return

    const currentWorkflow = workflows.find((w) => w.id === activeWorkflowId)
    if (!currentWorkflow) return

    const updatedWorkflow: Workflow = {
      ...currentWorkflow,
      nodes: nodes,
      edges: edges,
      active: true
    }

    const updatedWorkflows = workflows.map((w) => (w.id === activeWorkflowId ? updatedWorkflow : w))
    set({ workflows: updatedWorkflows })

    await window.api.saveWorkflow(updatedWorkflow)
  },

  deleteWorkflow: async (id) => {
    await window.api.deleteWorkflow(id)
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
      activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId
    }))
  },

  deactivateAll: () => {
    set((state) => ({
      workflows: state.workflows.map((w) => ({ ...w, active: false }))
    }))
  },

  closeEditor: () => {
    set({ activeWorkflowId: null })
  },

  runWorkflow: async (id) => {
    const wf = get().workflows.find((w) => w.id === id)
    if (wf) {
      await window.api.executeWorkflow(wf)
    }
  },

  toggleWorkflow: async (id) => {
    const { workflows } = get()
    const wf = workflows.find((w) => w.id === id)
    if (!wf) return

    const updatedWf = { ...wf, active: !wf.active }

    const updatedWorkflows = workflows.map((w) => (w.id === id ? updatedWf : w))
    set({ workflows: updatedWorkflows })

    await window.api.saveWorkflow(updatedWf)
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    })
  },

  loadWorkflows: async () => {
    const saved = await window.api.getAllWorkflows()
    set({ workflows: saved })
  },

  updateWorkflowName: (name: string) => {
    const { activeWorkflowId, workflows } = get()
    if (!activeWorkflowId) return

    set({
      workflows: workflows.map((w) =>
        w.id === activeWorkflowId ? { ...w, name } : w
      )
    })
  },
}))
