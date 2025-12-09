import { JSX, useEffect, useState } from 'react'
import styles from './ScriptModal.module.scss'
import { TerminalView } from '../Terminal/TerminalView'
import { X, Play } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  scriptName: string
  projectPath: string
  command: string
  runner: string
}

export function ScriptModal({
  isOpen,
  onClose,
  scriptName,
  projectPath,
  runner
}: Props): JSX.Element | null {
  const [sessionID] = useState(() => `${scriptName}-${Date.now()}`)
  const [isKilling, setIsKilling] = useState(false)

  useEffect(() => {
    // Only run this logic if the modal is actually open
    if (!isOpen) return

    const fullCommand = `${runner} ${scriptName}`
    console.log('🚀 Launching:', fullCommand)

    window.api.createTerminal(sessionID, projectPath, fullCommand)

    // Cleanup: Try to kill if component unmounts
    return () => {
      window.api.killTerminal(sessionID)
    }
  }, [sessionID, isOpen, projectPath, runner, scriptName])

  const handleStop = async (): Promise<void> => {
    setIsKilling(true)
    try {
      await window.api.killTerminal(sessionID)
      console.log('Process killed manually')
    } catch (e) {
      console.error('Error killing process', e)
    }
    setIsKilling(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>
            <Play size={16} fill="var(--accent-success)" color="var(--accent-success)" />
            Running: {scriptName}
          </h2>

          <button className={styles.closeBtn} onClick={handleStop} disabled={isKilling}>
            {isKilling ? (
              'Stopping...'
            ) : (
              <>
                <X size={16} /> Stop & Close
              </>
            )}
          </button>
        </div>

        <div className={styles.terminalContainer}>
          <TerminalView id={sessionID} />
        </div>
      </div>
    </div>
  )
}
