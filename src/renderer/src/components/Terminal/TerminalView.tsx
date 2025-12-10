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
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
      letterSpacing: 0,
      lineHeight: 1.2,
      scrollback: 5000,
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#cba6f7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
        selectionBackground: '#585b70',
        cursor: '#f5e0dc',
        cursorAccent: '#1e1e2e'
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

    const observer = new ResizeObserver(() => fitAddon.fit())
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#1e1e2e',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  )
}
