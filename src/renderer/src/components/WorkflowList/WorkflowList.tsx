import { JSX } from 'react'
import styles from './WorkflowList.module.scss'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { Trash2, Plus, StopCircle, Play } from 'lucide-react'

export function WorkflowList(): JSX.Element {
  const {
    workflows,
    selectWorkflow,
    createWorkflow,
    deleteWorkflow,
    deactivateAll,
    runWorkflow,
    toggleWorkflow
  } = useWorkflowStore()

  const handleStopAll = async (): Promise<void> => {
    if (confirm('Stop ALL running automation tasks in the background?')) {
      await window.api.stopAllWorkflows()
      deactivateAll()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.createBtn} onClick={() => createWorkflow('New Workflow')}>
          <Plus size={16} /> Create Workflow
        </button>

        <button
          className={styles.stopBtn}
          onClick={handleStopAll}
          title="Kill all background tasks"
        >
          <StopCircle size={16} /> Emergency Stop
        </button>
      </div>

      <div className={styles.grid}>
        {workflows.length === 0 ? (
          <div className={styles.empty}>
            <p>No workflows created yet.</p>
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} className={styles.card} onClick={() => selectWorkflow(wf.id)}>
              <div className={styles.cardHeader}>
                <h3>{wf.name}</h3>

                <button
                  className={`${styles.status} ${wf.active ? styles.active : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleWorkflow(wf.id)
                  }}
                  title={wf.active ? 'Click to Disable' : 'Click to Enable'}
                >
                  {wf.active ? 'Active' : 'Stopped'}
                </button>
              </div>

              <div className={styles.cardInfo}>
                <span>{wf.nodes.filter((n) => n.type === 'trigger').length} Triggers</span>
                <span>{wf.nodes.filter((n) => n.type !== 'trigger').length} Actions</span>
              </div>

              <div className={styles.actions}>
                {/* PLAY BUTTON */}
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    runWorkflow(wf.id)
                  }}
                  title="Run Once (Manual Trigger)"
                  style={{ marginRight: 8, color: '#a6e3a1' }}
                >
                  <Play size={16} />
                </button>

                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteWorkflow(wf.id)
                  }}
                  title="Delete Workflow"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
