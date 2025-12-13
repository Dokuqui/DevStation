import { JSX, useState } from 'react'
import { useOnSelectionChange } from '@xyflow/react'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import styles from './WorkflowBuilder.module.scss'
import { X } from 'lucide-react'

const TRIGGER_TYPES = [
  { value: 'file-change', label: 'On File Change' },
  { value: 'git-pull', label: 'On Git Pull' },
  { value: 'schedule', label: 'Cron Schedule' },
  { value: 'system-event', label: 'System Event' },
  { value: 'app-start', label: 'On App Start' }
]

const ACTION_TYPES = [
  { value: 'shell', label: 'Run Shell Command' },
  { value: 'script', label: 'Run Project Script' },
  { value: 'log', label: 'Write Log' },
  { value: 'notify', label: 'Show Notification' }
]

export function PropertiesPanel(): JSX.Element {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const nodes = useWorkflowStore((state) => state.nodes)
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeId(nodes[0]?.id || null)
    }
  })

  if (!selectedNode) {
    return (
      <div className={styles.propertiesPanel}>
        <div className={styles.emptyState}>Select a node to edit</div>
      </div>
    )
  }

  const isTrigger = selectedNode.type === 'trigger'
  const label = (selectedNode.data.label as string) || ''
  const type = (selectedNode.data.type as string) || ''
  const command = (selectedNode.data.command as string) || ''
  const cron = (selectedNode.data.cron as string) || ''
  const path = (selectedNode.data.path as string) || ''
  const condition = (selectedNode.data.condition as string) || 'cpu'
  const threshold = (selectedNode.data.threshold as string) || '80'
  const message = (selectedNode.data.message as string) || ''

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.panelHeader}>
        <h3>Properties</h3>
        <button onClick={() => setSelectedNodeId(null)}>
          <X size={14} />
        </button>
      </div>

      <div className={styles.formGroup}>
        <label>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Type</label>
        <select
          value={type}
          onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
        >
          {(isTrigger ? TRIGGER_TYPES : ACTION_TYPES).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {!isTrigger && (
        <div className={styles.formGroup}>
          <label>Command / Script</label>
          <textarea
            rows={3}
            value={command}
            onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
            placeholder="npm run build"
          />
        </div>
      )}

      {isTrigger && type === 'schedule' && (
        <div className={styles.formGroup}>
          <label>Cron Expression</label>
          <input
            type="text"
            value={cron}
            placeholder="* * * * *"
            onChange={(e) => updateNodeData(selectedNode.id, { cron: e.target.value })}
          />
        </div>
      )}

      {isTrigger && type === 'file-change' && (
        <div className={styles.formGroup}>
          <label>Watch Path</label>
          <input
            type="text"
            value={path}
            placeholder="./src/**/*.ts"
            onChange={(e) => updateNodeData(selectedNode.id, { path: e.target.value })}
          />
        </div>
      )}

      {isTrigger && type === 'system-event' && (
        <>
          <div className={styles.formGroup}>
            <label>Metric</label>
            <select
              value={condition}
              onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
            >
              <option value="cpu">CPU Usage</option>
              <option value="mem">Memory Usage</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Threshold (%)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => updateNodeData(selectedNode.id, { threshold: e.target.value })}
            />
          </div>
        </>
      )}

      {!isTrigger && type === 'notify' && (
        <div className={styles.formGroup}>
          <label>Notification Message</label>
          <input
            type="text"
            value={message}
            onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
            placeholder="Something happened!"
          />
        </div>
      )}
    </div>
  )
}
