import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import {
  Zap,
  Terminal,
  Split,
  Clock,
  Globe,
  MessageSquare,
  ArrowDownToLine,
  Play,
  Save,
  Code2
} from 'lucide-react'
import styles from './WorkflowBuilder.module.scss'
import { JSX } from 'react'
import { useSnippetStore } from '@renderer/store/useSnippetStore'

const ModeIcon = ({ mode }: { mode?: string }): JSX.Element => {
  if (mode === 'read') return <ArrowDownToLine size={14} />
  if (mode === 'write') return <Save size={14} />
  return <Play size={14} />
}

export function TriggerNode({ data }: NodeProps): JSX.Element {
  return (
    <div className={`${styles.node} ${styles.trigger}`}>
      <div className={styles.nodeHeader}>
        <Zap size={14} />
        <span>{data.label as string}</span>
      </div>
      <div className={styles.nodeBody}>
        <small>{data.type as string}</small>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
        style={{ bottom: -12 }}
      />
    </div>
  )
}

export function ActionNode({ data }: NodeProps): JSX.Element {
  const renderIcon = (): JSX.Element => {
    switch (data.type) {
      case 'delay':
        return <Clock size={14} />
      case 'http':
        return <Globe size={14} />
      case 'notify':
        return <MessageSquare size={14} />
      default:
        return <Terminal size={14} />
    }
  }

  const renderContent = (): JSX.Element => {
    if (data.type === 'delay')
      return <small className={styles.mono}>Wait {data.duration as number}ms</small>
    if (data.type === 'http')
      return (
        <code className={styles.mono}>
          {data.method as string} {data.url as string}
        </code>
      )
    return (
      <code className={styles.mono}>
        {(data.command as string) || (data.message as string) || 'Execute'}
      </code>
    )
  }

  return (
    <div className={`${styles.node} ${styles.action}`}>
      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
        style={{ bottom: -10 }}
      />
      <div className={styles.nodeHeader}>
        {renderIcon()}
        <span>{data.label as string}</span>
      </div>
      <div className={styles.nodeBody}>{renderContent()}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
        style={{ bottom: -12 }}
      />
    </div>
  )
}

export function ConditionNode({ data }: NodeProps): JSX.Element {
  return (
    <div className={`${styles.node} ${styles.condition}`} style={{ borderColor: '#f59e0b' }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <div className={styles.nodeHeader} style={{ borderLeftColor: '#f59e0b' }}>
        <Split size={14} color="#f59e0b" />
        <span>{data.label as string}</span>
      </div>

      <div className={styles.nodeBody}>
        <small>
          If output {(data.operator as string) || 'contains'}{' '}
          <b style={{ color: '#f59e0b' }}>{data.comparisonValue as string}</b>
        </small>
        <div style={{ height: 12 }} />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className={styles.logicHandle}
        style={{
          left: '30%',
          bottom: -15,
          background: '#10b981',
          borderColor: 'var(--bg-card)'
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: -35,
          left: '22%',
          fontSize: 10,
          color: '#10b981',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}
      >
        TRUE
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className={styles.logicHandle}
        style={{
          left: '70%',
          bottom: -15,
          background: '#ef4444',
          borderColor: 'var(--bg-card)'
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: -35,
          left: '63%',
          fontSize: 10,
          color: '#ef4444',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}
      >
        FALSE
      </span>
    </div>
  )
}

export function SnippetNode({ id, data }: NodeProps): JSX.Element {
  const snippets = useSnippetStore((state) => state.snippets)
  const { updateNodeData } = useReactFlow()

  const currentMode = (data.mode as string) || 'run'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const snippetId = e.target.value
    const snippet = snippets.find((s) => s.id === snippetId)
    const modeLabel = currentMode === 'read' ? 'Read' : currentMode === 'write' ? 'Write' : 'Run'

    updateNodeData(id, {
      snippetId,
      snippetName: snippet?.title,
      code: snippet?.content || '',
      label: `${modeLabel}: ${snippet?.title || 'Snippet'}`
    })
  }

  const modeClass =
    currentMode === 'read' ? styles.read : currentMode === 'write' ? styles.write : styles.run

  return (
    <div className={`${styles.node} ${styles.snippet} ${modeClass}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <div className={styles.nodeHeader}>
        <ModeIcon mode={currentMode} />
        <span>{(data.label as string) || 'Run Snippet'}</span>
      </div>

      <div className={styles.nodeBody}>
        <div className="nodrag">
          <select
            className={styles.nodeSelect}
            value={(data.snippetId as string) || ''}
            onChange={handleChange}
          >
            <option value="" disabled>
              Select snippet...
            </option>
            {snippets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {(data.snippetId as string) && (
          <div className={`${styles.statusBadge} ${styles.active}`}>
            <Code2 size={10} />
            <span>
              {currentMode === 'read'
                ? 'Loads to variable'
                : currentMode === 'write'
                  ? 'Overwrites file'
                  : 'Ready to execute'}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
        style={{ bottom: -12 }}
      />
    </div>
  )
}
