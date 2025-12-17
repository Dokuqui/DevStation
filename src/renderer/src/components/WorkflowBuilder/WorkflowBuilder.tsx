import { JSX, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import styles from './WorkflowBuilder.module.scss'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { nodeTypes } from './nodeTypes'
import { Plus, Save, CheckCircle, Edit3 } from 'lucide-react'
import { PropertiesPanel } from './PropertiesPanel'
import { useState } from 'react'

function WorkflowCanvas(): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [isSaved, setIsSaved] = useState(false)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, saveWorkflow, workflows, activeWorkflowId, updateWorkflowName } =
    useWorkflowStore()

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId)
  const workflowName = activeWorkflow?.name || 'Untitled Workflow'

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

  const handleSave = async (): Promise<void> => {
    await saveWorkflow()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

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

        <div className={styles.divider} />
        <div className={styles.nameInputWrapper}>
          <Edit3 size={14} className={styles.inputIcon} />
          <input 
            type="text" 
            className={styles.nameInput}
            value={workflowName}
            onChange={(e) => updateWorkflowName(e.target.value)}
            placeholder="Workflow Name"
          />
        </div>

        <div className={styles.spacer} />

        <button className={`${styles.btn} ${isSaved ? styles.success : ''}`} onClick={handleSave}>
          {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
          {isSaved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className={styles.wrapper}>
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
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color="#334155"
              style={{
                background: 'radial-gradient(circle at 50% 50%, #0e1319 0%, #0a0e14 100%)'
              }}
            />

            <Controls className={styles.controls} />
          </ReactFlow>
        </div>

        <PropertiesPanel />
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
