import { JSX, useState, useEffect } from 'react'
import styles from './App.module.scss'
import {
  BookMarked,
  ChevronLeft,
  Cpu,
  Download,
  FolderSearch,
  LayoutGrid,
  Moon,
  SettingsIcon,
  Sun,
  Terminal,
  Workflow
} from 'lucide-react'
import { Project } from '@renderer/types'
import { useTimeStore } from './store/useTimeStore'
import { ProjectCard } from './components/ProjectCard/ProjectCard'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ScanningModal } from './components/ScanningModal/ScanningModal'
import { ScriptModal } from './components/ScriptModal/ScriptModal'
import { SystemMonitor } from './components/SystemMonitor/SystemMonitor'
import { WorkflowBuilder } from './components/WorkflowBuilder/WorkflowBuilder'
import { useWorkflowStore } from './store/useWorkflowStore'
import { WorkflowList } from './components/WorkflowList/WorkflowList'
import { ToastContainer } from './components/Toast/ToastContainer'
import { useToastStore } from './store/useToastStore'
import { CloneModal } from './components/CloneModal/CloneModal'
import { Settings } from './components/Settings/Settings'
import { SnippetManager } from './components/SnippetManager/SnippetManager'

type View = 'projects' | 'system' | 'workflows' | 'snippets' | 'settings'

function App(): JSX.Element {
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows)
  const [currentView, setCurrentView] = useState<View>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeSession, setActiveSession] = useState<{
    script: string
    project: Project
  } | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [scanLogs, setScanLogs] = useState<string[]>([])
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isCloneOpen, setIsCloneOpen] = useState(false)

  const updateTimes = useTimeStore((state) => state.updateTimes)
  const addToast = useToastStore((state) => state.addToast)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.body.classList.toggle('light-mode', savedTheme === 'light')
    }
  }, [])

  const toggleTheme = (): void => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.body.classList.toggle('light-mode', newTheme === 'light')

    window.api.updateTheme(newTheme)
  }

  useEffect(() => {
    const removeListener = window.api.onShowToast((msg, type) => {
      addToast(msg, type)
    })

    return () => {
      removeListener()
    }
  }, [])

  useEffect(() => {
    const removeListener = window.api.onShowToast((msg, type) => {
      addToast(msg, type)
    })

    return () => {
      removeListener()
    }
  }, [])

  useEffect(() => {
    window.api.getAvailableIDEs().catch(console.error)

    const removeListener = window.api.onTimeUpdate((newTimes) => {
      updateTimes(newTimes)
    })

    return () => {
      removeListener()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsPaletteOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    loadWorkflows()
  }, [])

  const handleScan = async (pathOverride?: string): Promise<void> => {
    const path = pathOverride || (await window.api.selectFolder())

    if (!path) return

    setIsScanning(true)
    setScanLogs([])
    setCurrentView('projects')

    const removeLogListener = window.api.onScanLog((msg) => {
      setScanLogs((prev) => [...prev.slice(-49), msg])
    })

    try {
      const foundProjects = await window.api.scanProjects(path)
      setProjects(foundProjects)
    } finally {
      removeLogListener()
      setIsScanning(false)
    }
  }

  const handleRunScript = (scriptName: string, project: Project): void => {
    if (!scriptName && project.installCommand) {
      setActiveSession({ script: 'install', project })
    } else {
      setActiveSession({ script: scriptName, project })
    }
  }

  const { activeWorkflowId, closeEditor } = useWorkflowStore()

  return (
    <>
      <div className="titlebar" />
      <ToastContainer />
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarDrag} />
          <div className={styles.sidebarHeader}>
            <div className={styles.logo}>
              <Terminal size={24} />
            </div>
            <button
              className={styles.themeToggle}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className={styles.nav}>
            <button
              className={`${styles.navItem} ${currentView === 'projects' ? styles.active : ''}`}
              onClick={() => setCurrentView('projects')}
            >
              <LayoutGrid size={18} />
              <span>Projects</span>
            </button>

            <button
              className={`${styles.navItem} ${currentView === 'system' ? styles.active : ''}`}
              onClick={() => setCurrentView('system')}
            >
              <Cpu size={18} />
              <span>System</span>
            </button>

            <button
              className={`${styles.navItem} ${currentView === 'workflows' ? styles.active : ''}`}
              onClick={() => setCurrentView('workflows')}
            >
              <Workflow size={18} />
              <span>Workflows</span>
            </button>

            <button
              className={`${styles.navItem} ${currentView === 'snippets' ? styles.active : ''}`}
              onClick={() => setCurrentView('snippets')}
            >
              <BookMarked size={18} />
              <span>Knowledge</span>
            </button>

            <button
              className={`${styles.navItem} ${currentView === 'settings' ? styles.active : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </button>
          </div>

          <div className={styles.spacer} />

          <button
            className={styles.navItem}
            onClick={() => setIsCloneOpen(true)}
            style={{
              justifyContent: 'center',
              marginBottom: '8px',
              border: '1px solid var(--border)'
            }}
          >
            <Download size={16} /> Clone Repo
          </button>

          <button className={styles.btnPrimary} onClick={() => handleScan()}>
            <FolderSearch size={16} /> Scan Folder
          </button>
        </aside>

        <main className={styles.content}>
          <div className={styles.contentDrag} />
          {currentView === 'projects' && (
            <>
              <div className={styles.header}>
                <h1>Projects</h1>
                <span className={styles.badge}>{projects.length}</span>
              </div>

              {projects.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No projects loaded.</p>
                  <span className={styles.subtext}>
                    Click &quot;Scan Folder&quot; to get started.
                  </span>
                </div>
              ) : (
                <div className={styles.grid}>
                  {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onRunScript={handleRunScript} />
                  ))}
                </div>
              )}
            </>
          )}

          {currentView === 'system' && (
            <>
              <div className={styles.header}>
                <h1>System Monitor</h1>
              </div>
              <div className={styles.monitorWrapper}>
                <SystemMonitor />
              </div>
            </>
          )}

          {currentView === 'workflows' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {!activeWorkflowId ? (
                <>
                  <div className={styles.header}>
                    <h1>Automation</h1>
                  </div>
                  <WorkflowList />
                </>
              ) : (
                <>
                  <div className={styles.header}>
                    <button
                      onClick={closeEditor}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ccc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginRight: 12
                      }}
                    >
                      <ChevronLeft size={20} /> Back
                    </button>
                    <h1>Edit Workflow</h1>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                  >
                    <WorkflowBuilder />
                  </div>
                </>
              )}
            </div>
          )}

          {currentView === 'snippets' && <SnippetManager projects={projects} />}

          {currentView === 'settings' && <Settings />}
        </main>

        {isPaletteOpen && (
          <CommandPalette
            projects={projects}
            isOpen={true}
            onClose={() => setIsPaletteOpen(false)}
            onRunScript={handleRunScript}
          />
        )}

        {activeSession && (
          <ScriptModal
            isOpen={!!activeSession}
            onClose={() => setActiveSession(null)}
            scriptName={activeSession.script}
            project={activeSession.project}
          />
        )}

        <CloneModal
          isOpen={isCloneOpen}
          onClose={() => setIsCloneOpen(false)}
          onCloneSuccess={(parentPath) => {
            handleScan(parentPath)
          }}
        />

        {isScanning && <ScanningModal logs={scanLogs} />}
      </div>
    </>
  )
}

export default App
