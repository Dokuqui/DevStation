import { useState, useEffect, JSX } from 'react'
import styles from './GitOpsModal.module.scss'
import {
  X,
  GitBranch,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Loader2,
  CheckCircle2,
  CircleAlert
} from 'lucide-react'
import { Project } from '@renderer/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  project: Project
}

export function GitOpsModal({ isOpen, onClose, project }: Props): JSX.Element | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gitData, setGitData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchGitData()
    }
  }, [isOpen, project.path])

  const fetchGitData = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.gitStatus(project.path)
      setGitData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePull = async (): Promise<void> => {
    setOperationLoading('pull')
    try {
      await window.api.gitPull(project.path)
      await fetchGitData()
    } catch (error) {
      console.error(error)
    } finally {
      setOperationLoading(null)
    }
  }

  const handlePush = async (): Promise<void> => {
    setOperationLoading('push')
    try {
      await window.api.gitPush(project.path)
      await fetchGitData()
    } catch (error) {
      console.error(error)
    } finally {
      setOperationLoading(null)
    }
  }

  const handleCheckout = async (branch: string): Promise<void> => {
    setOperationLoading('checkout')
    try {
      await window.api.gitCheckout(project.path, branch)
      await fetchGitData()
    } catch (error) {
      console.error(error)
    } finally {
      setOperationLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <GitBranch size={18} /> {project.name} - Git
          </h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.loader}>
              <Loader2 className={styles.spin} size={24} />
            </div>
          ) : gitData ? (
            <>
              <div className={styles.statusRow}>
                <div className={styles.statusItem}>
                  <span className={styles.label}>Current Branch</span>
                  <div className={styles.branchSelect}>
                    <select
                      value={gitData.currentBranch}
                      onChange={(e) => handleCheckout(e.target.value)}
                      disabled={!!operationLoading}
                    >
                      {gitData.branches.map((b: string) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    {operationLoading === 'checkout' && (
                      <Loader2 size={14} className={styles.spin} />
                    )}
                  </div>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.label}>Status</span>
                  <span className={gitData.files.length === 0 ? styles.clean : styles.dirty}>
                    {gitData.files.length === 0 ? (
                      <>
                        <CheckCircle2 size={14} /> Clean
                      </>
                    ) : (
                      <>
                        <CircleAlert size={14} /> {gitData.files.length} changes
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={handlePull}
                  disabled={!!operationLoading}
                >
                  {operationLoading === 'pull' ? (
                    <Loader2 size={16} className={styles.spin} />
                  ) : (
                    <ArrowDown size={16} />
                  )}
                  <span>Pull {gitData.behind > 0 && `(${gitData.behind})`}</span>
                </button>

                <button
                  className={styles.actionBtn}
                  onClick={handlePush}
                  disabled={!!operationLoading}
                >
                  {operationLoading === 'push' ? (
                    <Loader2 size={16} className={styles.spin} />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                  <span>Push {gitData.ahead > 0 && `(${gitData.ahead})`}</span>
                </button>

                <button
                  className={styles.iconBtn}
                  onClick={fetchGitData}
                  title="Fetch/Refresh"
                  disabled={!!operationLoading}
                >
                  <RefreshCw size={16} className={loading ? styles.spin : ''} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.error}>
              Unable to load Git status. Is this a valid repository?
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
