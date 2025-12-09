import { JSX, useState } from 'react'
import styles from './App.module.scss'
import { FolderSearch, Terminal } from 'lucide-react'
import { Project } from '@renderer/types'
import { ProjectCard } from './components/ProjectCard/ProjectCard'
import { ScriptModal } from './components/ScriptModal/ScriptModal'

function App(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<{
    script: string
    project: Project
  } | null>(null)

  const handleScan = async (): Promise<void> => {
    const path = await window.api.selectFolder()
    if (!path) return

    setLoading(true)
    const foundProjects = await window.api.scanProjects(path)
    setProjects(foundProjects)
    setLoading(false)
  }

  const handleRunScript = (scriptName: string, project: Project): void => {
    setActiveSession({ script: scriptName, project })
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Terminal size={24} />
          <span>DevStation</span>
        </div>
        <button className={styles.btnPrimary} onClick={handleScan} disabled={loading}>
          <FolderSearch size={16} />
          {loading ? 'Scanning...' : 'Scan Projects'}
        </button>
      </aside>

      <main className={styles.content}>
        <h1 style={{ marginBottom: '20px' }}>Dashboard</h1>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>
            <p>No projects found. Select a folder to start.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}
          >
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onRunScript={handleRunScript} />
            ))}
          </div>
        )}
      </main>

      {activeSession && (
        <ScriptModal
          isOpen={!!activeSession}
          onClose={() => setActiveSession(null)}
          scriptName={activeSession.script}
          projectPath={activeSession.project.path}
          command={activeSession.project.scripts[activeSession.script]}
          runner={activeSession.project.runnerCommand || 'npm run'}
        />
      )}
    </div>
  )
}

export default App
