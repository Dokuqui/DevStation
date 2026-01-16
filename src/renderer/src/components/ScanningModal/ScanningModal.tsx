import { JSX, useEffect, useRef } from 'react'
import styles from './ScanningModal.module.scss'
import { Loader2, FolderSearch } from 'lucide-react'

interface Props {
  logs: string[]
}

export function ScanningModal({ logs }: Props): JSX.Element {
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconContainer}>
          <div className={styles.pulse} />
          <FolderSearch size={32} className={styles.mainIcon} />
        </div>

        <h2 className={styles.title}>Scanning Projects...</h2>

        <div className={styles.logWindow}>
          {logs.map((log, i) => (
            <div key={i} className={styles.logLine}>
              <span className={styles.prompt}>{'>'}</span> {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className={styles.footer}>
          <Loader2 size={14} className={styles.spinner} />
          <span>This might take a moment depending on folder size</span>
        </div>
      </div>
    </div>
  )
}
