import { SystemStats } from '@renderer/types'
import styles from './SystemMonitor.module.scss'
import { JSX, useEffect, useState } from 'react'
import {
  Cpu,
  Activity,
  HardDrive,
  Database,
  ArrowDown,
  ArrowUp,
  X,
  Wifi,
  ChevronRight
} from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

type DetailView = 'cpu' | 'memory' | 'disk' | 'network' | null

export function SystemMonitor(): JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [detailView, setDetailView] = useState<DetailView>(null)

  useEffect(() => {
    const removeListener = window.api.onSystemUpdate((newStats) => {
      setStats(newStats)
    })
    return removeListener
  }, [])

  if (!stats) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Activity className={styles.spinner} size={24} />
          <span>Reading system vitals...</span>
        </div>
      </div>
    )
  }

  const cards = [
    {
      id: 'cpu' as const,
      icon: Cpu,
      color: '#f38ba8',
      label: 'CPU',
      value: `${stats.cpu.global}%`,
      sub: stats.cpu.cores.length > 1 ? `${stats.cpu.cores.length} cores` : '',
      detail: 'cpu' as const
    },
    {
      id: 'memory' as const,
      icon: Activity,
      color: '#fab387',
      label: 'Memory',
      value: `${formatBytes(stats.mem.active)} / ${formatBytes(stats.mem.total)}`,
      sub: `${((stats.mem.active / stats.mem.total) * 100).toFixed(0)}% used`,
      detail: 'memory' as const
    },
    {
      id: 'disk' as const,
      icon: HardDrive,
      color: '#a6e3a1',
      label: 'Disk',
      value: `${stats.disk.main.use}%`,
      sub: `${formatBytes(stats.disk.main.used)} / ${formatBytes(stats.disk.main.size)}`,
      detail: 'disk' as const
    },
    {
      id: 'network' as const,
      icon: Wifi,
      color: '#89b4fa',
      label: 'Network',
      value: (
        <div className={styles.netLive}>
          <span>
            <ArrowDown size={14} /> {formatBytes(stats.net.total.down)}/s
          </span>
          <span>
            <ArrowUp size={14} /> {formatBytes(stats.net.total.up)}/s
          </span>
        </div>
      ),
      sub: stats.net.interfaces.length + ' interfaces',
      detail: 'network' as const
    }
  ]

  return (
    <>
      <div className={styles.container}>
        {cards.map((card) => (
          <div key={card.id} className={styles.card} onClick={() => setDetailView(card.detail)}>
            <div
              className={styles.iconBox}
              style={{
                background: card.color + '15',
                color: card.color,
                borderColor: card.color + '33'
              }}
            >
              <card.icon size={22} />
            </div>
            <div className={styles.content}>
              <div className={styles.label}>{card.label}</div>
              <div className={styles.value}>{card.value}</div>
              {card.sub && <div className={styles.sub}>{card.sub}</div>}
            </div>
            <div className={styles.chevron}>
              <ChevronRight size={18} />
            </div>
          </div>
        ))}
      </div>

      {detailView && (
        <div className={styles.overlay} onClick={() => setDetailView(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {detailView === 'cpu' && (
                  <>
                    <Cpu className="icon" /> CPU Cores
                  </>
                )}
                {detailView === 'memory' && (
                  <>
                    <Activity className="icon" /> Memory Breakdown
                  </>
                )}
                {detailView === 'disk' && (
                  <>
                    <HardDrive className="icon" /> Storage Drives
                  </>
                )}
                {detailView === 'network' && (
                  <>
                    <Wifi className="icon" /> Network Interfaces
                  </>
                )}
              </h2>
              <button onClick={() => setDetailView(null)}>
                <X size={22} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {detailView === 'cpu' && (
                <div className={styles.coreGrid}>
                  {stats.cpu.cores.map((load, i) => (
                    <div key={i} className={styles.core}>
                      <div className={styles.coreHeader}>
                        <Cpu size={14} />
                        <span>Core {i}</span>
                        <span className={styles.coreLoad}>{load}%</span>
                      </div>
                      <div className={styles.coreBar}>
                        <div className={styles.coreFill} style={{ width: `${load}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailView === 'memory' && (
                <div className={styles.memoryGrid}>
                  <div className={styles.memoryItem} style={{ color: '#fab387' }}>
                    <Activity size={24} />
                    <div>
                      <div className={styles.label}>Active Usage</div>
                      <div className={styles.bigValue}>{formatBytes(stats.mem.active)}</div>
                    </div>
                  </div>
                  <div className={styles.memoryItem} style={{ color: '#89b4fa' }}>
                    <Database size={24} />
                    <div>
                      <div className={styles.label}>Total Capacity</div>
                      <div className={styles.bigValue}>{formatBytes(stats.mem.total)}</div>
                    </div>
                  </div>
                  {stats.mem.swapTotal > 0 && (
                    <div className={styles.memoryItem} style={{ color: '#f38ba8' }}>
                      <HardDrive size={24} />
                      <div>
                        <div className={styles.label}>Swap Memory</div>
                        <div className={styles.bigValue}>
                          {formatBytes(stats.mem.swapUsed)}{' '}
                          <span style={{ fontSize: '1rem', opacity: 0.7 }}>
                            / {formatBytes(stats.mem.swapTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailView === 'disk' && (
                <div className={styles.diskList}>
                  {stats.disk.all.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#71717a' }}>No disks detected</p>
                  ) : (
                    stats.disk.all.map((d) => {
                      const isMain = d.mount === stats.disk.main.mount
                      // Determine color based on usage
                      const barColor = d.use > 90 ? '#f38ba8' : d.use > 75 ? '#f9e2af' : '#a6e3a1'

                      return (
                        <div
                          key={d.mount}
                          className={`${styles.diskItem} ${isMain ? styles.mainDisk : ''}`}
                        >
                          <div className={styles.diskHeader}>
                            <HardDrive size={22} color="#a6e3a1" />
                            <div className={styles.diskInfo}>
                              <div className={styles.diskMount}>
                                {d.mount}
                                {isMain && <span className={styles.mainBadge}>System</span>}
                              </div>
                              <div className={styles.diskMeta}>
                                {d.fs} • {d.type || 'Unknown'}
                              </div>
                            </div>
                            <div className={styles.diskUse}>{d.use}%</div>
                          </div>

                          <div className={styles.diskBar}>
                            <div
                              className={styles.diskFill}
                              style={{
                                width: `${d.use}%`,
                                background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`
                              }}
                            />
                          </div>

                          <div className={styles.diskDetails}>
                            <span>{formatBytes(d.used)} used</span>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span>{formatBytes(d.size - d.used)} free</span>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span>{formatBytes(d.size)} total</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {detailView === 'network' && (
                <div className={styles.netList}>
                  {stats.net.interfaces.map((n) => (
                    <div key={n.iface} className={styles.netItem}>
                      <div className={styles.netHeader}>
                        <Wifi size={20} />
                        <span className={styles.netIface}>{n.iface}</span>
                      </div>
                      <div className={styles.netFlow}>
                        <span>
                          <ArrowDown size={16} color="#a6e3a1" />
                          {formatBytes(n.rx_sec)}/s
                        </span>
                        <span>
                          <ArrowUp size={16} color="#f38ba8" />
                          {formatBytes(n.tx_sec)}/s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
