import { Handle, Position, NodeProps } from '@xyflow/react'
import { Zap, Terminal, Split, Clock, Globe, MessageSquare } from 'lucide-react'
import styles from './WorkflowBuilder.module.scss'
import { JSX } from 'react'

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
        style={{ bottom: -15 }}
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
        style={{ bottom: -15 }}
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
