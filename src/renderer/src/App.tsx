import { JSX, useState, useEffect } from 'react'
import styles from './App.module.scss'
import { ChevronLeft, Cpu, FolderSearch, LayoutGrid, Terminal, Workflow } from 'lucide-react'
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

type View = 'projects' | 'system' | 'workflows'

function App(): JSX.Element {
  const loadWorkflows = useWorkflowStore(state => state.loadWorkflows)
  const [currentView, setCurrentView] = useState<View>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeSession, setActiveSession] = useState<{
    script: string
    project: Project
  } | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [scanLogs, setScanLogs] = useState<string[]>([])
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const updateTimes = useTimeStore((state) => state.updateTimes)

  useEffect(() => {
    window.api.getAvailableIDEs().catch(console.error)

    const removeListener = window.api.onTimeUpdate((newTimes) => {
      updateTimes(newTimes)
    })

    return () => {
      removeListener()
    }
  }, [updateTimes])

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

  const handleScan = async (): Promise<void> => {
    const path = await window.api.selectFolder()
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
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <Terminal size={24} />
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
          </div>

          <div className={styles.spacer} />

          <button className={styles.btnPrimary} onClick={handleScan} disabled={isScanning}>
            <FolderSearch size={16} />
            {isScanning ? 'Scanning...' : 'Scan Folder'}
          </button>
        </aside>

        <main className={styles.content}>
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

        {isScanning && <ScanningModal logs={scanLogs} />}
      </div>
    </>
  )
}

export default App
