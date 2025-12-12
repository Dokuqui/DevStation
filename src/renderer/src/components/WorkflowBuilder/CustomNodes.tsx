import { Handle, Position, NodeProps } from '@xyflow/react'
import { Zap, Terminal } from 'lucide-react'
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
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  )
}

export function ActionNode({ data }: NodeProps): JSX.Element {
  return (
    <div className={`${styles.node} ${styles.action}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <Terminal size={14} />
        <span>{data.label as string}</span>
      </div>
      <div className={styles.nodeBody}>
        <code>{(data.command as string) || 'Run Script'}</code>
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  )
}
