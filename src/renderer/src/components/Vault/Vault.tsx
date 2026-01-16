import { JSX, useState, useEffect, useCallback } from 'react'
import styles from './Vault.module.scss'
import {
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Key,
  FileText,
  Save,
  RefreshCw,
  Copy,
  Search,
  X,
  ChevronRight
} from 'lucide-react'
import { Project } from '@renderer/types'
import { useToastStore } from '@renderer/store/useToastStore'

interface Props {
  projects: Project[]
}

interface Secret {
  id: string
  label: string
  category: string
  isEncrypted: boolean
}

export function Vault({ projects }: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<'env' | 'secrets'>('env')

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [envContent, setEnvContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [secrets, setSecrets] = useState<Secret[]>([])
  const [showAddSecret, setShowAddSecret] = useState(false)
  const [newSecret, setNewSecret] = useState({ label: '', value: '', category: 'api' })
  const [revealedSecret, setRevealedSecret] = useState<{ id: string; value: string } | null>(null)

  const addToast = useToastStore((state) => state.addToast)

  const handleProjectClick = (id: string): void => {
    if (selectedProjectId === id) {
      setSelectedProjectId(null)
      setEnvContent('')
    } else {
      setSelectedProjectId(id)
    }
  }

  const fetchSecrets = useCallback(async () => {
    return window.api.getSecrets()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchSecrets()
        if (!cancelled) setSecrets(data)
      } catch (error) {
        console.error(error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchSecrets])

  const loadSecrets = useCallback(async () => {
    const data = await fetchSecrets()
    setSecrets(data)
  }, [fetchSecrets])

  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId)
      if (proj) {
        window.api.getEnvFile(proj.path).then(setEnvContent)
      }
    }
  }, [selectedProjectId])

  const handleSaveEnv = async (): Promise<void> => {
    if (!selectedProjectId) return
    setIsSaving(true)
    const proj = projects.find((p) => p.id === selectedProjectId)
    if (proj) {
      await window.api.saveEnvFile(proj.path, envContent)
      addToast('.env saved successfully', 'success')
    }
    setTimeout(() => setIsSaving(false), 500)
  }

  const handleAddSecret = async (): Promise<void> => {
    if (!newSecret.label || !newSecret.value) return
    await window.api.addSecret(newSecret)
    setShowAddSecret(false)
    setNewSecret({ label: '', value: '', category: 'api' })
    loadSecrets()
    addToast('Secret added', 'success')
  }

  const toggleReveal = async (id: string): Promise<void> => {
    if (revealedSecret?.id === id) {
      setRevealedSecret(null)
    } else {
      const value = await window.api.revealSecret(id)
      if (value) setRevealedSecret({ id, value })
    }
  }

  const handleCopySecret = async (id: string): Promise<void> => {
    const val = revealedSecret?.id === id ? revealedSecret.value : await window.api.revealSecret(id)
    if (val) {
      navigator.clipboard.writeText(val)
      addToast('Copied to clipboard', 'success')
    }
  }

  const handleDeleteSecret = async (id: string): Promise<void> => {
    if (confirm('Delete permanently?')) {
      await window.api.deleteSecret(id)
      loadSecrets()
      addToast('Secret deleted', 'info')
    }
  }

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'env' ? styles.active : ''}`}
          onClick={() => setActiveTab('env')}
        >
          <FileText size={16} /> Project Environments
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'secrets' ? styles.active : ''}`}
          onClick={() => setActiveTab('secrets')}
        >
          <Lock size={16} /> Global Secrets
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'env' && (
          <div className={styles.envView}>
            <div className={styles.projectListCol}>
              <div className={styles.searchBar}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  placeholder="Filter projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className={styles.projectList}>
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.projectItem} ${selectedProjectId === p.id ? styles.active : ''}`}
                    onClick={() => handleProjectClick(p.id)}
                  >
                    <span className={styles.projectName}>{p.name}</span>
                    <ChevronRight size={14} className={styles.chevron} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.editorArea}>
              {selectedProjectId ? (
                <>
                  <div className={styles.editorToolbar}>
                    <div className={styles.fileInfo}>
                      <FileText size={14} /> .env
                    </div>
                    <button className={styles.saveBtn} onClick={handleSaveEnv} disabled={isSaving}>
                      {isSaving ? (
                        <RefreshCw className={styles.spin} size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                  <div className={styles.editorWrapper}>
                    <textarea
                      className={styles.editor}
                      value={envContent}
                      onChange={(e) => setEnvContent(e.target.value)}
                      spellCheck={false}
                      placeholder="# KEY=VALUE"
                    />
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    <FileText size={64} strokeWidth={1} />
                  </div>
                  <h3>No Project Selected</h3>
                  <p>Select a project from the left to edit its .env file</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'secrets' && (
          <div className={styles.secretsView}>
            <div className={styles.header}>
              <div>
                <h2>Global Secrets</h2>
                <p>Securely store API keys and tokens accessible across all workflows.</p>
              </div>
              <button className={styles.addBtn} onClick={() => setShowAddSecret(true)}>
                <Plus size={16} /> New Secret
              </button>
            </div>

            {showAddSecret && (
              <div className={styles.addForm}>
                <input
                  placeholder="KEY_NAME"
                  value={newSecret.label}
                  onChange={(e) => setNewSecret({ ...newSecret, label: e.target.value })}
                  autoFocus
                />
                <select
                  value={newSecret.category}
                  onChange={(e) => setNewSecret({ ...newSecret, category: e.target.value })}
                >
                  <option value="api">API Key</option>
                  <option value="ssh">SSH Token</option>
                  <option value="db">Database URL</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="password"
                  placeholder="Value..."
                  value={newSecret.value}
                  onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                />
                <div className={styles.formActions}>
                  <button className={styles.confirmBtn} onClick={handleAddSecret}>
                    Save Secret
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowAddSecret(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className={styles.secretGrid}>
              {secrets.map((s) => (
                <div key={s.id} className={styles.secretCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.keyInfo}>
                      <Key size={14} className={styles.keyIcon} />
                      <span className={styles.label}>{s.label}</span>
                    </div>
                    <span className={styles.badge}>{s.category}</span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.valueDisplay}>
                      {revealedSecret?.id === s.id ? (
                        <code className={styles.revealed}>{revealedSecret.value}</code>
                      ) : (
                        <span className={styles.dots}>••••••••••••••••</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.actions}>
                      <button onClick={() => handleCopySecret(s.id)} title="Copy">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => toggleReveal(s.id)} title="Show/Hide">
                        {revealedSecret?.id === s.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteSecret(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
