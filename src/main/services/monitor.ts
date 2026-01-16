import { BrowserWindow } from 'electron'
import { EventEmitter } from 'events'
import si from 'systeminformation'

export const monitorEvents = new EventEmitter()

let interval: NodeJS.Timeout | null = null

export function startSystemMonitor(mainWindow: BrowserWindow): void {
  if (interval) clearInterval(interval)

  const sendStats = async (): Promise<void> => {
    if (mainWindow.isDestroyed()) return

    try {
      const [cpu, mem, disks, net] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats()
      ])

      const cpuStats = {
        global: Math.round(cpu.currentLoad),
        cores: cpu.cpus.map((c) => Math.round(c.load))
      }

      let mainDisk = disks[0]

      if (process.platform === 'win32') {
        mainDisk = disks.find((d) => d.fs.toLowerCase() === 'c:') || disks[0]
      } else if (process.platform === 'darwin') {
        mainDisk =
          disks.find((d) => d.mount === '/' || d.mount === '/System/Volumes/Data') || disks[0]
      } else {
        mainDisk = disks.find((d) => d.mount === '/' || d.mount === '/home') || disks[0]
      }

      const allDisks = disks
        .filter((d) => d.size > 0 && !d.mount.includes('/snap') && !d.mount.includes('/dev/loop'))
        .map((d) => ({
          fs: d.fs,
          mount: d.mount,
          type: d.type,
          size: d.size,
          used: d.used,
          use: Math.round(d.use)
        }))

      const mainDiskDetail = {
        fs: mainDisk.fs,
        mount: mainDisk.mount,
        type: mainDisk.type,
        size: mainDisk.size,
        used: mainDisk.used,
        use: Math.round(mainDisk.use)
      }

      const netInterfaces = net.map((n) => ({
        iface: n.iface,
        rx_sec: n.rx_sec,
        tx_sec: n.tx_sec
      }))

      const stats = {
        cpu: cpuStats,
        mem: {
          total: mem.total,
          used: mem.used,
          active: mem.active,
          swapTotal: mem.swaptotal || 0,
          swapUsed: mem.swapused || 0
        },
        disk: {
          main: mainDiskDetail,
          all: allDisks
        },
        net: {
          total: {
            up: netInterfaces.reduce((a, n) => a + n.tx_sec, 0),
            down: netInterfaces.reduce((a, n) => a + n.rx_sec, 0)
          },
          interfaces: netInterfaces
        }
      }

      monitorEvents.emit('stats', stats)

      mainWindow.webContents.send('system:update', stats)
    } catch (err) {
      console.warn('System monitor failed, retrying...', (err as Error).message)
    }
  }

  sendStats()
  interval = setInterval(sendStats, 2000)
}
