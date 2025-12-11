import { JSX, useState, useEffect } from 'react'
import styles from './App.module.scss'
import { Cpu, FolderSearch, LayoutGrid, Terminal } from 'lucide-react'
import { Project } from '@renderer/types'
import { ProjectCard } from './components/ProjectCard/ProjectCard'
import { ScriptModal } from './components/ScriptModal/ScriptModal'
import { useTimeStore } from './store/useTimeStore'
import { ScanningModal } from './components/ScanningModal/ScanningModal'
import { SystemMonitor } from './components/SystemMonitor/SystemMonitor'

type View = 'projects' | 'system'

function App(): JSX.Element {
  const [currentView, setCurrentView] = useState<View>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeSession, setActiveSession] = useState<{
    script: string
    project: Project
  } | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [scanLogs, setScanLogs] = useState<string[]>([])

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

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Terminal size={24} />
          <span>DevStation</span>
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
      </main>

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
  )
}

export default App
