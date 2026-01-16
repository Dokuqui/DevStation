import { JSX, useCallback, useRef, useEffect, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  ConnectionLineType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import styles from './WorkflowBuilder.module.scss'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { nodeTypes } from './nodeTypes'
import { Plus, Save, CheckCircle, Edit3, Split, FileCode } from 'lucide-react'
import { PropertiesPanel } from './PropertiesPanel'

function WorkflowCanvas(): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [isSaved, setIsSaved] = useState(false)
  const [dotsColor, setDotsColor] = useState('#334155')

  useEffect(() => {
    const updateColor = (): void => {
      const isLight = document.body.classList.contains('light-mode')
      setDotsColor(isLight ? '#94a3b8' : '#334155')
    }

    updateColor()

    const observer = new MutationObserver(updateColor)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    saveWorkflow,
    workflows,
    activeWorkflowId,
    updateWorkflowName
  } = useWorkflowStore()

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId)
  const workflowName = activeWorkflow?.name || 'Untitled Workflow'

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: 'var(--text-muted)',
      strokeWidth: 2
    }
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })

      let initialData = {}

      if (type === 'trigger') {
        initialData = { label: 'New Trigger', type: 'file-change' }
      } else if (type === 'action') {
        initialData = { label: 'New Action', type: 'shell' }
      } else if (type === 'condition') {
        initialData = { label: 'Check Output', type: 'condition', operator: 'contains' }
      } else if (type === 'snippet') {
        initialData = { label: 'Run Snippet', type: 'snippet', snippetId: '' }
      }

      const newNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: initialData
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
          <Plus size={14} /> Trigger
        </div>
        <div
          className={styles.draggable}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'action')}
        >
          <Plus size={14} /> Action
        </div>

        <div
          className={styles.draggable}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'snippet')}
          style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
        >
          <FileCode size={14} /> Snippet
        </div>

        <div
          className={styles.draggable}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'condition')}
          style={{ borderColor: 'var(--accent-warning)', color: 'var(--accent-warning)' }}
        >
          <Split size={14} /> Logic
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
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.SmoothStep}
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
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color={dotsColor}
              style={{
                backgroundColor: 'var(--bg-canvas)'
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
