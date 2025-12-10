import styles from './ProjectCard.module.scss'
import { Project } from '@renderer/types'
import { Box, Cog, FileCode, GitBranch, CircleDot, Clock, Play, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { JSX } from 'react'

const TYPE_CONFIG = {
  node: { color: '#89faa9', icon: Box, label: 'Node.js' },
  python: { color: '#3776ab', icon: FileCode, label: 'Python' },
  rust: { color: '#f76d47', icon: Cog, label: 'Rust' },
  go: { color: '#00add8', icon: FileCode, label: 'Go' },
  unknown: { color: '#a6adc8', icon: Box, label: 'App' }
} as const

interface Props {
  project: Project
  onRunScript: (scriptName: string, project: Project) => void
}

export function ProjectCard({ project, onRunScript }: Props): JSX.Element {
  const config = TYPE_CONFIG[project.type] || TYPE_CONFIG.unknown
  const Icon = config.icon
  const scripts = Object.keys(project.scripts)

  const timeAgo = formatDistanceToNow(project.lastModified, { addSuffix: true })

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.iconWrapper} style={{ backgroundColor: config.color + '22' }}>
            <Icon size={20} color={config.color} strokeWidth={2} />
          </div>
          <h3 className={styles.name}>{project.name}</h3>
        </div>

        <div className={styles.badges}>
          <span className={styles.versionBadge}>
            {config.label} {project.version && `v${project.version}`}
          </span>
        </div>
      </div>

      {project.git && (
        <div className={styles.gitStatus}>
          <GitBranch size={14} />
          <span className={styles.branchName}>{project.git.branch}</span>

          {project.git.dirty && (
            <span className={styles.dirtyBadge}>
              <CircleDot size={10} fill="currentColor" />
              modified
            </span>
          )}

          {project.git.ahead > 0 && <span className={styles.aheadBadge}>+{project.git.ahead}</span>}
          {project.git.behind > 0 && (
            <span className={styles.behindBadge}>-{project.git.behind}</span>
          )}
        </div>
      )}

      <div className={styles.meta}>
        <div className={styles.path} title={project.path}>
          {project.path}
        </div>
        <div className={styles.lastModified}>
          <Clock size={12} />
          {timeAgo}
        </div>
      </div>

      <div className={styles.scripts}>
        {scripts.length > 0 ? (
          scripts.map((script) => (
            <button
              key={script}
              className={styles.scriptBtn}
              onClick={(e) => {
                e.stopPropagation()
                onRunScript(script, project)
              }}
              style={{ '--script-color': config.color } as React.CSSProperties}
            >
              <Play size={12} />
              {script}
            </button>
          ))
        ) : (
          <span className={styles.noScripts}>No scripts</span>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.installBtn}
          onClick={(e) => {
            e.stopPropagation()
            onRunScript('install', project)
          }}
        >
          <Download size={14} />
          Install Deps
        </button>
      </div>
    </div>
  )
}
