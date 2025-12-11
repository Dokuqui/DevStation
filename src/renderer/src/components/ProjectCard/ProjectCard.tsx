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
  ChevronDown
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG = {
  node: { color: '#89faa9', icon: Box, label: 'Node' },
  python: { color: '#3776ab', icon: Box, label: 'Python' },
  rust: { color: '#f76d47', icon: Box, label: 'Rust' },
  go: { color: '#00add8', icon: Box, label: 'Go' },
  unknown: { color: '#a6adc8', icon: Box, label: 'App' }
} as const

const PREFERRED_IDES: Record<string, IDE[]> = {
  python: ['pycharm', 'vscode', 'sublime'],
  rust: ['rustrover', 'vscode', 'sublime'],
  go: ['goland', 'vscode', 'sublime'],
  node: ['webstorm', 'vscode', 'sublime'],
  unknown: ['vscode', 'sublime']
}

const IDE_DISPLAY_NAME: Record<IDE, string> = {
  vscode: 'VS Code',
  pycharm: 'PyCharm',
  rustrover: 'RustRover',
  goland: 'GoLand',
  webstorm: 'WebStorm',
  sublime: 'Sublime Text',
  intellij: 'IntelliJ',
  rider: 'Rider'
}

interface Props {
  project: Project
  onRunScript?: (scriptName: string, project: Project) => void
  onShowTerminal?: (terminalId: string) => void
}

export function ProjectCard({ project, onRunScript, onShowTerminal }: Props): JSX.Element {
  const config = TYPE_CONFIG[project.type] || TYPE_CONFIG.unknown
  const Icon = config.icon
  const scripts = Object.keys(project.scripts)

  const [runningScripts, setRunningScripts] = useState<Record<string, string>>({})
  const [availableIDEs, setAvailableIDEs] = useState<IDE[]>([])
  const [showIdeMenu, setShowIdeMenu] = useState(false)

  const listenersRef = useRef<Record<string, () => void>>({})

  useEffect(() => {
    const currentListeners = listenersRef.current
    return () => {
      Object.values(currentListeners).forEach((unsub) => unsub())
    }
  }, [])

  useEffect(() => {
    window.api.getAvailableIDEs().then(setAvailableIDEs).catch(console.error)
  }, [])

  const preferred = PREFERRED_IDES[project.type] || PREFERRED_IDES.unknown
  const validIDEs = availableIDEs.filter((ide) => preferred.includes(ide))

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

  const handleIdeClick = (e: React.MouseEvent): void => {
    e.stopPropagation()

    if (validIDEs.length === 0) {
      window.api.openInVSCode(project.path)
      return
    }

    if (validIDEs.length === 1) {
      window.api.openProjectInIDE(validIDEs[0], project.path)
    } else {
      setShowIdeMenu((prev) => !prev)
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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.iconWrapper} style={{ backgroundColor: `${config.color}22` }}>
            <Icon size={24} color={config.color} />
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{project.name}</h3>
            <span className={styles.path} title={project.path}>
              {project.path}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.ideWrapper}>
            <button onClick={handleIdeClick} className={styles.actionBtn}>
              <Code size={16} />
              {validIDEs.length > 1 && <ChevronDown size={12} />}
            </button>

            {showIdeMenu && validIDEs.length > 1 && (
              <div className={styles.ideMenu}>
                {validIDEs.map((ide) => (
                  <div
                    key={ide}
                    className={styles.ideMenuItem}
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api.openProjectInIDE(ide, project.path)
                      setShowIdeMenu(false)
                    }}
                  >
                    {IDE_DISPLAY_NAME[ide] || ide}
                  </div>
                ))}
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

      {project.git && (
        <div className={`${styles.gitBlock} ${!project.git.isClean ? styles.gitDirty : ''}`}>
          <div className={styles.gitHeader}>
            <div className={styles.branch}>
              <GitBranch size={12} />
              {project.git.branch}
            </div>
            <div className={styles.status}>
              {project.git.isClean ? (
                <span className={styles.clean}>
                  <CheckCircle2 size={12} /> Clean
                </span>
              ) : (
                <span className={styles.dirty}>
                  <CircleAlert size={12} /> {project.git.filesChanged} changed
                </span>
              )}
            </div>
          </div>

          <div className={styles.commit}>
            <GitCommit size={12} className={styles.commitIcon} />
            <span className={styles.message}>{project.git.lastCommitMessage || 'No commits'}</span>
          </div>

          {(project.git.ahead > 0 || project.git.behind > 0) && (
            <div className={styles.sync}>
              {project.git.ahead > 0 && <span>↑ {project.git.ahead}</span>}
              {project.git.behind > 0 && <span>↓ {project.git.behind}</span>}
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
        <div className={styles.meta}>
          <Clock size={12} />
          {formatDistanceToNow(new Date(project.lastModified))} ago
        </div>

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
                className={styles.miniStop}
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
      </div>
    </div>
  )
}
