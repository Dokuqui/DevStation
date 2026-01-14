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
  { value: 'delay', label: 'Delay / Wait' },
  { value: 'http', label: 'HTTP Request' },
  { value: 'log', label: 'Write Log' },
  { value: 'notify', label: 'Show Notification' }
]

export function PropertiesPanel(): JSX.Element {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const nodes = useWorkflowStore((state) => state.nodes)
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  useOnSelectionChange({
    onChange: ({ nodes }) => setSelectedNodeId(nodes[0]?.id || null)
  })

  if (!selectedNode) {
    return (
      <div className={styles.propertiesPanel}>
        <div className={styles.emptyState}>Select a node to edit</div>
      </div>
    )
  }

  const isTrigger = selectedNode.type === 'trigger'
  const isCondition = selectedNode.type === 'condition'
  const data = selectedNode.data

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
          value={data.label as string}
          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
        />
      </div>

      {!isCondition && (
        <div className={styles.formGroup}>
          <label>Type</label>
          <select
            value={data.type as string}
            onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
          >
            {(isTrigger ? TRIGGER_TYPES : ACTION_TYPES).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(data.type === 'shell' || data.type === 'script') && (
        <div className={styles.formGroup}>
          <label>Command</label>
          <textarea
            rows={3}
            value={(data.command as string) || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
            placeholder="npm run build"
          />
        </div>
      )}

      {data.type === 'delay' && (
        <div className={styles.formGroup}>
          <label>Duration (ms)</label>
          <input
            type="number"
            value={(data.duration as number) || 1000}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { duration: parseInt(e.target.value) })
            }
          />
          <small style={{ color: 'var(--text-muted)' }}>1000ms = 1 second</small>
        </div>
      )}

      {data.type === 'http' && (
        <>
          <div className={styles.formGroup}>
            <label>Method</label>
            <select
              value={(data.method as string) || 'GET'}
              onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>URL</label>
            <input
              type="text"
              value={(data.url as string) || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
              placeholder="https://api.example.com/webhook"
            />
          </div>
          {data.method !== 'GET' && (
            <div className={styles.formGroup}>
              <label>Body (JSON)</label>
              <textarea
                rows={4}
                value={(data.body as string) || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                placeholder='{"status": "success"}'
              />
            </div>
          )}
        </>
      )}

      {data.type === 'notify' && (
        <>
          <div className={styles.formGroup}>
            <label>Message</label>
            <input
              type="text"
              value={(data.message as string) || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Notification Color</label>
            <select
              value={(data.notificationType as string) || 'info'}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { notificationType: e.target.value })
              }
            >
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="error">Error (Red)</option>
            </select>
          </div>

          <div
            className={styles.formGroup}
            style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}
          >
            <input
              type="checkbox"
              id="native-notify"
              checked={data.native === true}
              onChange={(e) => updateNodeData(selectedNode.id, { native: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <label htmlFor="native-notify" style={{ margin: 0, cursor: 'pointer' }}>
              Also show System Notification?
            </label>
          </div>
        </>
      )}

      {isCondition && (
        <>
          <div className={styles.formGroup}>
            <label>Check Previous Output</label>
            <select
              value={(data.operator as string) || 'contains'}
              onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals Exact Match</option>
              <option value="gt">Is Greater Than (Number)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Value to Compare</label>
            <input
              type="text"
              value={(data.comparisonValue as string) || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { comparisonValue: e.target.value })}
            />
          </div>
        </>
      )}

      {isTrigger && data.type === 'file-change' && (
        <div className={styles.formGroup}>
          <label>Watch Path</label>
          <input
            type="text"
            value={(data.path as string) || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { path: e.target.value })}
            placeholder="./src"
          />
        </div>
      )}

      {isTrigger && data.type === 'schedule' && (
        <div className={styles.formGroup}>
          <label>Cron Expression</label>
          <input
            type="text"
            value={(data.cron as string) || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { cron: e.target.value })}
            placeholder="* * * * *"
          />
        </div>
      )}
    </div>
  )
}
