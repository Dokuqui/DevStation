import { useEffect, useState, useRef, useMemo, JSX, useCallback } from 'react'
import styles from './CommandPalette.module.scss'
import {
  Search,
  Terminal,
  Zap,
  Trash2,
  RefreshCw,
  Box,
  Play,
  Square,
  ArrowUpCircle,
  ArrowDownCircle,
  WorkflowIcon
} from 'lucide-react'
import { Project } from '@renderer/types'
import { useToastStore } from '@renderer/store/useToastStore'
import { useWorkflowStore } from '@renderer/store/useWorkflowStore'

interface Props {
  projects: Project[]
  isOpen: boolean
  onClose: () => void
  onRunScript: (script: string, project: Project) => void
}

type PaletteItem = {
  id: string
  title: string
  subtext?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  group: 'Projects' | 'Scripts' | 'Global' | 'Processes' | 'Docker' | 'Workflows'
  action: () => void
}

export function CommandPalette({ projects, onClose, onRunScript }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((state) => state.addToast)
  const workflows = useWorkflowStore((state) => state.workflows)

  const runCommand = useCallback(
    (promise: Promise<unknown>, successTitle: string = 'Success'): void => {
      promise
        .then((result) => {
          addToast(typeof result === 'string' ? result : successTitle, 'success')
        })
        .catch((err) => {
          const msg = err.message
            ? err.message.replace('Error invoking remote method:', '').trim()
            : 'Unknown error occurred'

          addToast(msg, 'error')
        })
    },
    [addToast]
  )

  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = []

    list.push(
      {
        id: 'kill-node',
        title: 'Kill all Node.js processes',
        subtext: 'node, node.exe, bun, deno',
        icon: Trash2,
        group: 'Processes',
        action: () => runCommand(window.api.killProcess('node'), 'Node.js Killed')
      },
      {
        id: 'kill-python',
        title: 'Kill all Python processes',
        subtext: 'python, python3, python.exe, py',
        icon: Trash2,
        group: 'Processes',
        action: () => runCommand(window.api.killProcess('python'), 'Python Killed')
      },
      {
        id: 'kill-go',
        title: 'Kill all Go processes',
        subtext: 'go, go.exe, built binaries',
        icon: Trash2,
        group: 'Processes',
        action: () => runCommand(window.api.killProcess('go'), 'Go Killed')
      },
      {
        id: 'kill-rust',
        title: 'Kill all Rust/cargo processes',
        subtext: 'rustc, cargo, target/debug/*.exe',
        icon: Trash2,
        group: 'Processes',
        action: () => runCommand(window.api.killProcess('rust'), 'Rust Killed')
      },
      {
        id: 'kill-csharp',
        title: 'Kill all .NET/C# processes',
        subtext: 'dotnet, csc, vbcscompiler, *.exe',
        icon: Trash2,
        group: 'Processes',
        action: () => runCommand(window.api.killProcess('dotnet'), '.NET Killed')
      },
      {
        id: 'docker-restart',
        title: 'Restart Docker',
        subtext: 'Restart Docker Desktop/Daemon',
        icon: RefreshCw,
        group: 'Docker',
        action: () => runCommand(window.api.restartDocker(), 'Docker Restarted')
      },
      {
        id: 'docker-start',
        title: 'Start Docker',
        subtext: 'Launch Docker daemon',
        icon: Play,
        group: 'Docker',
        action: () => runCommand(window.api.startDocker(), 'Docker Started')
      },
      {
        id: 'docker-stop',
        title: 'Stop Docker',
        subtext: 'Stop Docker daemon',
        icon: Square,
        group: 'Docker',
        action: () => runCommand(window.api.stopDocker(), 'Docker Stopped')
      },
      {
        id: 'docker-compose-up',
        title: 'Docker Compose Up',
        subtext: 'Run docker-compose up -d in current project',
        icon: ArrowUpCircle,
        group: 'Docker',
        action: () => runCommand(window.api.dockerComposeUp(), 'Compose Up')
      },
      {
        id: 'docker-compose-down',
        title: 'Docker Compose Down',
        subtext: 'Run docker-compose down',
        icon: ArrowDownCircle,
        group: 'Docker',
        action: () => runCommand(window.api.dockerComposeDown(), 'Compose Down')
      },
      {
        id: 'docker-prune',
        title: 'Docker System Prune',
        subtext: 'Remove unused containers, networks, images',
        icon: Trash2,
        group: 'Docker',
        action: () => runCommand(window.api.dockerPrune(), 'System Pruned')
      }
    )

    projects.forEach((p) => {
      list.push({
        id: `open-${p.id}`,
        title: p.name,
        subtext: `Open ${p.path}`,
        icon: Box,
        group: 'Projects',
        action: () => window.api.openInVSCode(p.path)
      })
    })

    projects.forEach((p) => {
      Object.keys(p.scripts).forEach((script) => {
        list.push({
          id: `run-${p.id}-${script}`,
          title: `Run ${script}`,
          subtext: p.name,
          icon: Terminal,
          group: 'Scripts',
          action: () => onRunScript(script, p)
        })
      })
    })

    workflows.forEach((w) => {
      list.push({
        id: `wf-${w.id}`,
        title: w.name,
        subtext: `Run automation workflow`,
        icon: WorkflowIcon,
        group: 'Workflows',
        action: () => {
          // Pass the full object to ensure Main process has data
          runCommand(window.api.runWorkflow(w), `Workflow "${w.name}" Started`)
        }
      })
    })

    return list
  }, [projects, onRunScript, runCommand, workflows])

  const filteredItems = useMemo(() => {
    if (!query) return items.slice(0, 50)
    const lowerQuery = query.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtext?.toLowerCase().includes(lowerQuery) ||
        item.group.toLowerCase().includes(lowerQuery)
    )
  }, [items, query])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filteredItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filteredItems[selectedIndex]
        if (item) {
          item.action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filteredItems, selectedIndex, onClose])

  let lastGroup = ''

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <div className={styles.shortcut}>ESC</div>
        </div>

        <div className={styles.list}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No results found
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const showHeader = item.group !== lastGroup
              lastGroup = item.group
              const Icon = item.icon

              return (
                <div key={item.id}>
                  {showHeader && <div className={styles.groupLabel}>{item.group}</div>}
                  <div
                    className={`${styles.item} ${index === selectedIndex ? styles.active : ''}`}
                    onClick={() => {
                      item.action()
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon size={16} className={styles.icon} />
                    <div className={styles.content}>
                      <div className={styles.title}>
                        {item.title}
                        {item.subtext && <span className={styles.subtext}>{item.subtext}</span>}
                      </div>
                    </div>
                    {index === selectedIndex && <Zap size={14} className={styles.icon} />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className={styles.footer}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to select
          </span>
        </div>
      </div>
    </div>
  )
}
