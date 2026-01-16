import { Search, X } from 'lucide-react'
import styles from './ProjectSearch.module.scss'
import { JSX } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
}

export function ProjectSearch({ value, onChange }: Props): JSX.Element {
  return (
    <div className={styles.wrapper}>
      <Search size={16} className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        placeholder="Filter projects..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className={styles.clearBtn} onClick={() => onChange('')} title="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
