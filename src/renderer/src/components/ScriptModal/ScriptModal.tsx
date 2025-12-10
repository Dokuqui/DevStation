import { JSX, useEffect, useState } from 'react'
import styles from './ScriptModal.module.scss'
import { TerminalView } from '../Terminal/TerminalView'
import { X, Play } from 'lucide-react'
import { Project } from '@renderer/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  scriptName: string
  project: Project
}

function getCommand(project: Project, scriptName: string): string {
  if (scriptName === 'install') {
    if (project.installCommand) return project.installCommand

    switch (project.type) {
      case 'node':
        return 'npm install'
      case 'python':
        return 'pip install -r requirements.txt'
      case 'go':
        return 'go mod download'
      case 'rust':
        return 'cargo build'
      default:
        return 'echo "No install command found"'
    }
  }

  const scriptCmd = project.scripts[scriptName]
  if (!scriptCmd) return `echo "Script '${scriptName}' not found"`

  if (project.runnerCommand) {
    return `${project.runnerCommand} ${scriptName}`
  }

  return scriptCmd
}

export function ScriptModal({ isOpen, onClose, scriptName, project }: Props): JSX.Element | null {
  const [sessionID] = useState(() => `${scriptName}-${Date.now()}`)
  const [isKilling, setIsKilling] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const commandToRun = getCommand(project, scriptName)
    window.api.createTerminal(sessionID, project.path, commandToRun)
    return () => {
      window.api.killTerminal(sessionID)
    }
  }, [isOpen, sessionID, project, scriptName])

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
            Running: {scriptName || 'Install Dependencies'}
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
