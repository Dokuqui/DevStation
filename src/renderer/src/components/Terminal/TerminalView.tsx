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
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
      letterSpacing: 0,
      lineHeight: 1.4,
      scrollback: 5000,
      theme: {
        background: '#09090b',
        foreground: '#f4f4f5',
        cursor: '#7c3aed',
        cursorAccent: '#ffffff',
        selectionBackground: 'rgba(124, 58, 237, 0.3)',

        black: '#27272a',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e4e4e7',

        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    })

    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    const handleResize = (): void => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    terminalRef.current = term

    term.onData((data) => {
      window.api.writeTerminal(id, data)
    })

    const cleanupListener = window.api.onTerminalData(id, (data) => {
      term.write(data)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      cleanupListener()
      term.dispose()
    }
  }, [id])

  useEffect(() => {
    const container = containerRef.current
    const fitAddon = fitAddonRef.current
    if (!container || !fitAddon) return

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => fitAddon.fit())
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#09090b',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #27272a'
      }}
    />
  )
}
