import { useState, useEffect, useRef, JSX } from 'react'
import styles from './ProjectCard.module.scss'
import { IDE, Project } from '@renderer/types'
import {
  Box,
  Terminal,
  Code,
  GitCommit,
  GitBranch,
  CircleAlert,
  CheckCircle2,
  Play,
  Square,
  Loader2,
  Clock,
  Download,
  ChevronDown,
  Timer,
  Settings2,
  FileCode,
  Cog
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTimeStore } from '@renderer/store/useTimeStore'
import { GitOpsModal } from '../GitModal/GitOpsModal'

const TYPE_CONFIG = {
  node: { color: '#89faa9', icon: Box, label: 'Node.js' },
  python: { color: '#3776ab', icon: FileCode, label: 'Python' },
  rust: { color: '#f76d47', icon: Cog, label: 'Rust' },
  go: { color: '#00add8', icon: Box, label: 'Go' },
  csharp: { color: '#512bd4', icon: Box, label: 'C#' },
  unknown: { color: '#a6adc8', icon: Box, label: 'App' }
} as const

const PREFERRED_IDES: Record<string, IDE[]> = {
  python: ['pycharm', 'vscode', 'sublime', 'custom'],
  rust: ['rustrover', 'vscode', 'sublime', 'custom'],
  go: ['goland', 'vscode', 'sublime', 'custom'],
  node: ['webstorm', 'vscode', 'sublime', 'custom'],
  csharp: ['rider', 'vscode', 'sublime', 'custom'],
  unknown: ['vscode', 'sublime', 'custom']
}

interface Props {
  project: Project
  onRunScript?: (scriptName: string, project: Project) => void
  onShowTerminal?: (terminalId: string) => void
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function ProjectCard({ project, onRunScript, onShowTerminal }: Props): JSX.Element {
  const config = TYPE_CONFIG[project.type] || TYPE_CONFIG.unknown
  const Icon = config.icon
  const scripts = Object.keys(project.scripts)

  const [runningScripts, setRunningScripts] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableIDEs, setAvailableIDEs] = useState<any[]>([])
  const [showIdeMenu, setShowIdeMenu] = useState(false)
  const timeSpent = useTimeStore((state) => state.times[project.id] || 0)

  const listenersRef = useRef<Record<string, () => void>>({})

  const [isGitModalOpen, setIsGitModalOpen] = useState(false)

  // FIX: Ensure we have a valid initial state and handle updates robustly
  const [gitState, setGitState] = useState(project.git)
  const [prevGitProp, setPrevGitProp] = useState(project.git)

  // Derived state pattern: Sync state when props change from parent (e.g. rescan)
  if (project.git !== prevGitProp) {
    setPrevGitProp(project.git)
    // Only update if prop is valid, otherwise keep local state (prevents flashing)
    if (project.git) {
      setGitState(project.git)
    }
  }

  useEffect(() => {
    const currentListeners = listenersRef.current
    return () => {
      Object.values(currentListeners).forEach((unsub) => unsub())
    }
  }, [])

  const refreshIDEs = (): void => {
    window.api.getAvailableIDEs().then(setAvailableIDEs).catch(console.error)
  }

  useEffect(() => {
    refreshIDEs()
  }, [])

  const preferred = PREFERRED_IDES[project.type] || PREFERRED_IDES.unknown
  const validIDEs = availableIDEs.filter((ide) => preferred.includes(ide.id) || ide.id === 'custom')

  const handleRunScript = async (scriptName: string, isInstall = false): Promise<void> => {
    let command = ''
    if (isInstall) {
      command = project.installCommand || 'npm install'
    } else {
      command = `${project.runnerCommand || 'npm run'} ${project.scripts[scriptName]}`
    }

    if (!command) return

    if (onRunScript) onRunScript(scriptName, project)

    const termId = `${project.id}-${scriptName}`

    setRunningScripts((prev) => ({ ...prev, [scriptName]: termId }))

    try {
      const res = await window.api.createTerminal(termId, project.path, command)

      if (res.success) {
        if (onShowTerminal) onShowTerminal(termId)

        const cleanup = window.api.onTerminalExit(termId, () => {
          setRunningScripts((prev) => {
            if (prev[scriptName] === termId) {
              const next = { ...prev }
              delete next[scriptName]
              return next
            }
            return prev
          })
        })
        listenersRef.current[termId] = cleanup
      } else {
        console.error('Failed to start:', res.error)
        setRunningScripts((prev) => {
          const next = { ...prev }
          delete next[scriptName]
          return next
        })
      }
    } catch (err) {
      console.error(err)
      setRunningScripts((prev) => {
        const next = { ...prev }
        delete next[scriptName]
        return next
      })
    }
  }

  const handleStopScript = async (scriptName: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const termId = runningScripts[scriptName]
    if (!termId) return
    await window.api.killTerminal(termId)
  }

  const handleIdeClick = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()

    const settings = await window.api.getSettings()
    const defaultEditor = settings?.defaultEditor

    if (defaultEditor && defaultEditor !== 'ask') {
      window.api.openProjectInIDE(defaultEditor, project.path)
    } else {
      setShowIdeMenu((prev) => !prev)
    }
  }

  const handleAddCustomIDE = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    setShowIdeMenu(false)
    const result = await window.api.selectCustomIDE()
    if (result) {
      refreshIDEs()
    }
  }

  const handleShowTerminal = (scriptName: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    const termId = runningScripts[scriptName]
    if (termId && onShowTerminal) {
      onShowTerminal(termId)
    }
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrapper} style={{ backgroundColor: `${config.color}22` }}>
              <Icon size={24} color={config.color} />
            </div>
            <div className={styles.info}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className={styles.name}>{project.name}</h3>
                <span className={styles.versionBadge} style={{ borderColor: config.color }}>
                  {config.label} {project.version ? `v${project.version}` : ''}
                </span>
              </div>
              <span className={styles.path} title={project.path}>
                {project.path}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.ideWrapper}>
              <button onClick={handleIdeClick} className={styles.actionBtn} title="Select Editor">
                <Code size={16} />
                <ChevronDown size={12} />
              </button>

              {showIdeMenu && (
                <div className={styles.ideMenu}>
                  {validIDEs.map((ide) => (
                    <div
                      key={ide.id}
                      className={styles.ideMenuItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        window.api.openProjectInIDE(ide.id, project.path)
                        setShowIdeMenu(false)
                      }}
                    >
                      {ide.name}
                    </div>
                  ))}

                  {validIDEs.length > 0 && <div className={styles.menuSeparator} />}

                  <div
                    className={styles.ideMenuItem}
                    onClick={handleAddCustomIDE}
                    style={{ color: '#89b4fa' }}
                  >
                    <Settings2 size={12} style={{ marginRight: 6 }} />
                    Add Custom Editor...
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.api.openSystemTerminal(project.path)
              }}
              className={styles.actionBtn}
              title="Open OS Terminal"
            >
              <Terminal size={16} />
            </button>
          </div>
        </div>

        {gitState && (
          <div
            className={`${styles.gitBlock} ${!gitState.isClean ? styles.gitDirty : ''}`}
            onClick={() => setIsGitModalOpen(true)}
          >
            <div className={styles.gitHeader}>
              <div className={styles.branch}>
                <GitBranch size={12} />
                {/* FIX: Ensure fallback if branch is missing */}
                {gitState.branch || 'HEAD'}
              </div>
              <div className={styles.status}>
                {gitState.isClean ? (
                  <span className={styles.clean}>
                    <CheckCircle2 size={12} /> Clean
                  </span>
                ) : (
                  <span className={styles.dirty}>
                    <CircleAlert size={12} /> {gitState.filesChanged} changed
                  </span>
                )}
              </div>
            </div>

            <div className={styles.commit}>
              <GitCommit size={12} className={styles.commitIcon} />
              <span className={styles.message}>{gitState.lastCommitMessage || 'No commits'}</span>
            </div>

            {(gitState.ahead > 0 || gitState.behind > 0) && (
              <div className={styles.sync}>
                {gitState.ahead > 0 && <span>↑ {gitState.ahead}</span>}
                {gitState.behind > 0 && <span>↓ {gitState.behind}</span>}
              </div>
            )}
          </div>
        )}

        <div className={styles.scriptsSection}>
          <div className={styles.sectionLabel}>Scripts</div>
          <div className={styles.scriptList}>
            {scripts.map((script) => {
              const isRunning = !!runningScripts[script]
              return (
                <div
                  key={script}
                  className={`${styles.scriptPill} ${isRunning ? styles.running : ''}`}
                  style={{ '--accent': config.color } as React.CSSProperties}
                  onClick={(e) =>
                    isRunning ? handleShowTerminal(script, e) : handleRunScript(script)
                  }
                >
                  {isRunning ? (
                    <>
                      <div className={styles.runContent}>
                        <Loader2 size={12} className={styles.spinner} />
                        <span>{script}</span>
                      </div>
                      <button
                        className={styles.stopBtn}
                        onClick={(e) => handleStopScript(script, e)}
                        title="Stop Script"
                      >
                        <Square size={10} fill="currentColor" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      <span>{script}</span>
                    </>
                  )}
                </div>
              )
            })}
            {scripts.length === 0 && <span className={styles.empty}>No scripts found</span>}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.metaRow}>
            <div className={styles.meta}>
              <Clock size={12} />
              {formatDistanceToNow(new Date(project.lastModified))} ago
            </div>

            <div
              className={styles.meta}
              title="Time spent running scripts"
              style={{
                color: timeSpent > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)',
                opacity: timeSpent > 0 ? 1 : 0.5
              }}
            >
              <Timer size={12} />
              {formatTime(timeSpent)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`${styles.installBtn} ${runningScripts['install'] ? styles.running : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                if (runningScripts['install']) {
                  handleShowTerminal('install', e)
                } else {
                  handleRunScript('install', true)
                }
              }}
            >
              {runningScripts['install'] ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
                  <span>Install Deps</span>
                  <div
                    className={styles.stopBtn}
                    style={{ marginLeft: 6 }}
                    onClick={(e) => handleStopScript('install', e)}
                    title="Stop Installation"
                  >
                    <Square size={10} fill="currentColor" />
                  </div>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Install Deps</span>
                </>
              )}
            </button>

            {/* Git toggle button */}
            {gitState && (
              <button
                className={styles.gitToggle}
                onClick={() => setIsGitModalOpen(true)}
                title="Manage Git"
              >
                <GitBranch size={14} />
                {gitState.branch || 'HEAD'}
              </button>
            )}
          </div>
        </div>
      </div>

      <GitOpsModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        project={project}
        // FIX: Ensure we update state even if data looks partial
        onStatusChange={(newGit) => setGitState((prev) => ({ ...prev, ...newGit }))}
      />
    </>
  )
}
