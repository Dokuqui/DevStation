import { JSX, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface Props {
  id: string
}

export function TerminalView({ id }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    fitAddon.fit()
    terminalRef.current = term

    term.onData((data) => {
      window.api.writeTerminal(id, data)
    })

    const cleanupListener = window.api.onTerminalData(id, (data) => {
      term.write(data)
    })

    return () => {
      cleanupListener()
      term.dispose()
    }
  }, [id])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '300px', background: '#1e1e2e', padding: '10px' }}
    />
  )
}
