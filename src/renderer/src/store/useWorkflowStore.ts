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
  saveWorkflow: () => void

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
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

  saveWorkflow: () => {
    const { activeWorkflowId, nodes, edges, workflows } = get()
    if (!activeWorkflowId) return

    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, nodes, edges } : w
    )
    set({ workflows: updatedWorkflows })
    console.log('Saved Workflow:', activeWorkflowId)
  },

  onNodesChange: (changes) =>
    set({
      nodes: applyNodeChanges(changes, get().nodes)
    }),

  onEdgesChange: (changes) =>
    set({
      edges: applyEdgeChanges(changes, get().edges)
    }),

  onConnect: (connection) =>
    set({
      edges: addEdge(connection, get().edges)
    }),

  addNode: (node) =>
    set({
      nodes: [...get().nodes, node]
    })
}))
