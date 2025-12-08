// src/renderer/src/App.tsx
import { JSX, useEffect, useState } from 'react'
import styles from './App.module.scss'
import { Terminal } from 'lucide-react'

function App(): JSX.Element {
  const [ipcResponse, setIpcResponse] = useState<string>('')

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const checkConnection = async () => {
      const response = await window.api.ping()
      setIpcResponse(response)
    }
    checkConnection()
  }, [])

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Terminal size={24} />
          <span>DevStation</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ color: 'var(--text-main)' }}>Dashboard</div>
          <div style={{ color: 'var(--text-muted)' }}>Workflows</div>
          <div style={{ color: 'var(--text-muted)' }}>Snippets</div>
        </nav>
      </aside>

      <main className={styles.content}>
        <h1>Welcome to DevStation</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
          IPC Status: <span style={{ color: 'var(--accent-success)' }}>{ipcResponse}</span>
        </p>
      </main>
    </div>
  )
}

export default App
