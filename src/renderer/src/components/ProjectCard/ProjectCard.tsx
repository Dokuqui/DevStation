import styles from './ProjectCard.module.scss'
import { Project } from '@renderer/types'
import { Box, Cog, FileCode } from 'lucide-react'
import { JSX } from 'react'

const TYPE_CONFIG = {
  node: { color: '#89FAA9FF', icon: <Box size={18} /> },
  python: { color: '#4926D4FF', icon: <FileCode size={18} /> },
  rust: { color: '#fab387', icon: <Cog size={18} /> },
  go: { color: '#26AED4FF', icon: <FileCode size={18} /> },
  unknown: { color: '#a6adc8', icon: <Box size={18} /> }
}

interface Props {
  project: Project
}

export function ProjectCard({ project }: Props): JSX.Element {
  const config = TYPE_CONFIG[project.type] || TYPE_CONFIG.unknown
  const scriptKeys = Object.keys(project.scripts).slice(0, 3)

  return (
    <div className={styles.card} style={{ borderColor: project.isFavorite ? 'gold' : '' }}>
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Dynamic Icon */}
          <span style={{ color: config.color }}>{config.icon}</span>
          <h3>{project.name}</h3>
        </div>
        <span className={styles.version}>
          {project.type} v{project.version}
        </span>
      </div>

      <div className={styles.path}>{project.path}</div>

      <div className={styles.tags}>
        {scriptKeys.map((script) => (
          <span key={script} style={{ borderColor: config.color }}>
            {script}
          </span>
        ))}
      </div>
    </div>
  )
}
