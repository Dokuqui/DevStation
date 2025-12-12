import { JSX, useCallback, useRef } from 'react'
import { ReactFlow, Controls, Background, useReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import styles from './WorkflowBuilder.module.scss'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { nodeTypes } from './nodeTypes'
import { Plus, Save } from 'lucide-react'

function WorkflowCanvas(): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, saveWorkflow } =
    useWorkflowStore()

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })

      const newNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: {
          label: type === 'trigger' ? 'New Trigger' : 'New Action',
          type: type === 'trigger' ? 'file-change' : 'shell'
        }
      }

      addNode(newNode)
    },
    [screenToFlowPosition, addNode]
  )

  return (
    <div className={styles.builderContainer}>
      <div className={styles.toolbar}>
        <div
          className={styles.draggable}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'trigger')}
        >
          <Plus size={14} /> Trigger Node
        </div>
        <div
          className={styles.draggable}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'action')}
        >
          <Plus size={14} /> Action Node
        </div>

        <div className={styles.spacer} />

        <button className={styles.btn} onClick={saveWorkflow}>
          <Save size={14} /> Save
        </button>
      </div>

      <div className={styles.canvasWrapper} ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#333" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

export function WorkflowBuilder(): JSX.Element {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  )
}
