import { useState, useEffect, JSX } from 'react'
import styles from './CloneModal.module.scss'
import { X, Download, Folder, Zap, Github, LogOut, Search } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCloneSuccess: (parentPath: string) => void
}

export function CloneModal({ isOpen, onClose, onCloneSuccess }: Props): JSX.Element | null {
  const [mode, setMode] = useState<'url' | 'github'>('url')
  const [url, setUrl] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [shallow, setShallow] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [repos, setRepos] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      checkLogin()
    }
  }, [isOpen])

  const checkLogin = async (): Promise<void> => {
    const status = await window.api.githubStatus()
    setIsLoggedIn(status)
    if (status) loadRepos()
  }

  const loadRepos = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.githubRepos()
      setRepos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (): Promise<void> => {
    setLoading(true)
    try {
      await window.api.githubLogin()
      setIsLoggedIn(true)
      loadRepos()
    } catch {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await window.api.githubLogout()
    setIsLoggedIn(false)
    setRepos([])
  }

  const handleClone = async (): Promise<void> => {
    if (!url || !parentPath) return
    setLoading(true)
    setError('')

    try {
      await window.api.gitClone(url, parentPath, shallow)
      onCloneSuccess(parentPath)
      onClose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Clone failed')
    } finally {
      setLoading(false)
    }
  }

  const selectFolder = async (): Promise<void> => {
    const path = await window.api.selectFolder()
    if (path) setParentPath(path)
  }

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <Download size={18} /> Clone Repository
          </h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'url' ? styles.active : ''}`}
            onClick={() => setMode('url')}
          >
            From URL
          </button>
          <button
            className={`${styles.tab} ${mode === 'github' ? styles.active : ''}`}
            onClick={() => setMode('github')}
          >
            <Github size={14} /> GitHub
          </button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {mode === 'url' && (
            <div className={styles.group}>
              <label>Repository URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
                autoFocus
              />
            </div>
          )}

          {mode === 'github' && (
            <div className={styles.githubPanel}>
              {!isLoggedIn ? (
                <div className={styles.loginBox}>
                  <p>Connect your GitHub account to browse repositories.</p>
                  <button onClick={handleLogin} className={styles.githubBtn} disabled={loading}>
                    <Github size={16} /> {loading ? 'Waiting...' : 'Login with GitHub'}
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.searchRow}>
                    <div className={styles.search}>
                      <Search size={14} />
                      <input
                        placeholder="Search your repositories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button onClick={handleLogout} className={styles.logoutBtn} title="Logout">
                      <LogOut size={14} />
                    </button>
                  </div>

                  <div className={styles.repoList}>
                    {loading && <div className={styles.loadingText}>Loading repositories...</div>}
                    {!loading &&
                      filteredRepos.map((repo) => (
                        <div
                          key={repo.id}
                          className={`${styles.repoItem} ${url === repo.clone_url ? styles.selected : ''}`}
                          onClick={() => setUrl(repo.clone_url)}
                        >
                          <div className={styles.repoName}>
                            {repo.private ? <span className={styles.privateTag}>Lock</span> : null}
                            {repo.full_name}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className={styles.group}>
            <label>Where to clone?</label>
            <div className={styles.pathInput}>
              <input value={parentPath} readOnly placeholder="Select a parent folder..." />
              <button onClick={selectFolder}>
                <Folder size={16} />
              </button>
            </div>
          </div>

          <div className={styles.toggle} onClick={() => setShallow(!shallow)}>
            <div className={`${styles.checkbox} ${shallow ? styles.checked : ''}`}>
              {shallow && <Zap size={12} />}
            </div>
            <div>
              <span className={styles.toggleLabel}>Use Turbo Clone (Shallow)</span>
              <p className={styles.toggleDesc}>Fetches only the latest history. Much faster.</p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancel}>
            Cancel
          </button>
          <button
            onClick={handleClone}
            className={styles.confirm}
            disabled={loading || !url || !parentPath}
          >
            {loading ? 'Cloning...' : 'Clone Repository'}
          </button>
        </div>
      </div>
    </div>
  )
}
