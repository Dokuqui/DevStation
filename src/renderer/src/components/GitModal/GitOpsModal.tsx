/* eslint-disable @typescript-eslint/no-explicit-any */
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
  CircleAlert,
  Archive,
  Save
} from 'lucide-react'
import { GitInfo, Project } from '@renderer/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  project: Project
  onStatusChange?: (newGitInfo: GitInfo) => void
}

export function GitOpsModal({
  isOpen,
  onClose,
  project,
  onStatusChange
}: Props): JSX.Element | null {
  const [gitData, setGitData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')

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

      if (onStatusChange && data) {
        const normalizedInfo: GitInfo = {
          branch: data.currentBranch || 'HEAD',
          isClean: data.files.length === 0,
          filesChanged: data.files.length,
          ahead: data.ahead,
          behind: data.behind,
          lastCommitMessage: project.git?.lastCommitMessage || '',
          lastCommitDate: null,
          lastCommitAuthor: null
        }
        onStatusChange(normalizedInfo)
      }
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

  const handleCommit = async (): Promise<void> => {
    if (!commitMessage.trim()) return
    setOperationLoading('commit')
    try {
      await window.api.gitCommit(project.path, commitMessage)
      setCommitMessage('')
      await fetchGitData()
    } catch (error) {
      console.error(error)
    } finally {
      setOperationLoading(null)
    }
  }

  const handleStash = async (): Promise<void> => {
    setOperationLoading('stash')
    try {
      await window.api.gitStash(project.path)
      await fetchGitData()
    } catch (error) {
      console.error(error)
    } finally {
      setOperationLoading(null)
    }
  }

  if (!isOpen) return null

  const hasChanges = gitData && gitData.files && gitData.files.length > 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <GitBranch size={18} /> {project.name}
          </h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading && !gitData ? (
            <div className={styles.loader}>
              <Loader2 className={styles.spin} size={32} />
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
                      {gitData.branches?.map((b: string) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      )) || <option>{gitData.currentBranch}</option>}
                    </select>
                    {operationLoading === 'checkout' && (
                      <Loader2 size={14} className={styles.spin} />
                    )}
                  </div>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.label}>Status</span>
                  <div className={gitData.files.length === 0 ? styles.clean : styles.dirty}>
                    {gitData.files.length === 0 ? (
                      <>
                        <CheckCircle2 size={16} /> Clean
                      </>
                    ) : (
                      <>
                        <CircleAlert size={16} /> {gitData.files.length} changes
                      </>
                    )}
                  </div>
                </div>
              </div>

              {hasChanges && (
                <div className={styles.commitSection}>
                  <div className={styles.commitInputWrapper}>
                    <input
                      type="text"
                      placeholder="Commit message..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className={styles.commitInput}
                      disabled={!!operationLoading}
                    />
                    <button
                      className={styles.commitBtn}
                      onClick={handleCommit}
                      disabled={!commitMessage.trim() || !!operationLoading}
                      title="Commit changes"
                    >
                      {operationLoading === 'commit' ? (
                        <Loader2 size={16} className={styles.spin} />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  </div>

                  <div className={styles.stashRow}>
                    <span className={styles.stashLabel}>
                      Or stash changes to switch branch safely:
                    </span>
                    <button
                      className={styles.stashBtn}
                      onClick={handleStash}
                      disabled={!!operationLoading}
                    >
                      <Archive size={14} /> Stash
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={handlePull}
                  disabled={!!operationLoading}
                  title="Pull Changes"
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
                  title="Push Changes"
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
                  <RefreshCw size={18} className={loading ? styles.spin : ''} />
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
