import { exec } from 'child_process'
import os from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function isDockerInstalled(): Promise<boolean> {
  try {
    await execAsync('docker --version')
    return true
  } catch {
    return false
  }
}

export async function killProcessByName(name: string): Promise<string> {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32'
    const cmd = isWin
      ? `taskkill /F /IM ${name}${name.endsWith('.exe') ? '' : '.exe'} /T`
      : `pkill -f ${name}`

    console.log(`[Commands] Executing: ${cmd}`)

    exec(cmd, (err, stdout) => {
      if (err) {
        resolve(`Result: ${err.message}`)
      } else {
        resolve(stdout || 'Processes killed')
      }
    })
  })
}

export async function restartDocker(): Promise<string> {
  const isWin = os.platform() === 'win32'
  const isMac = os.platform() === 'darwin'

  let cmd = ''

  if (isWin) {
    cmd = 'powershell -NoProfile -Command "Restart-Service *docker* -Force"'
  } else if (isMac) {
    cmd = 'osascript -e \'quit app "Docker"\' && open -a Docker'
  } else {
    cmd = 'sudo systemctl restart docker'
  }

  try {
    await execAsync(cmd)
    return 'Docker restarted successfully'
  } catch (err) {
    handleDockerError(err)
    return 'Error'
  }
}

export async function startDocker(): Promise<string> {
  const platform = os.platform()
  let cmd = ''

  if (platform === 'win32') {
    cmd = 'powershell -NoProfile -Command "Start-Service *docker*"'
  } else if (platform === 'darwin') {
    cmd = 'open -a Docker'
  } else {
    cmd = 'sudo systemctl start docker'
  }

  try {
    await execAsync(cmd)
    return 'Docker started'
  } catch (err) {
    handleDockerError(err)
    return 'Error'
  }
}

export async function stopDocker(): Promise<string> {
  const platform = os.platform()
  let cmd = ''

  if (platform === 'win32') {
    cmd = 'powershell -NoProfile -Command "Stop-Service *docker* -Force"'
  } else if (platform === 'darwin') {
    cmd = 'osascript -e \'quit app "Docker"\''
  } else {
    cmd = 'sudo systemctl stop docker'
  }

  try {
    await execAsync(cmd)
    return 'Docker stopped'
  } catch (err) {
    handleDockerError(err)
    return 'Error'
  }
}

export async function dockerPrune(): Promise<string> {
  if (!(await isDockerInstalled())) {
    throw new Error('Docker is not installed or not found in PATH.')
  }

  try {
    await execAsync('docker system prune -af --volumes')
    return 'Docker pruned (unused containers, images, volumes removed)'
  } catch (err) {
    throw new Error(`Docker prune failed: ${(err as Error).message}`)
  }
}

export async function dockerComposeUp(cwd: string): Promise<string> {
  if (!(await isDockerInstalled())) {
    throw new Error('Docker is not installed.')
  }

  try {
    await execAsync('docker-compose up -d', { cwd })
    return 'docker-compose up -d executed'
  } catch (err) {
    throw new Error(`docker-compose up failed: ${(err as Error).message}`)
  }
}

export async function dockerComposeDown(cwd: string): Promise<string> {
  if (!(await isDockerInstalled())) {
    throw new Error('Docker is not installed.')
  }

  try {
    await execAsync('docker-compose down', { cwd })
    return 'docker-compose down executed'
  } catch (err) {
    throw new Error(`docker-compose down failed: ${(err as Error).message}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleDockerError(err: any): void {
  const msg = (err.message || '').toString()

  if (
    msg.includes('OpenError') ||
    msg.includes('CloseError') ||
    msg.includes('Access is denied') ||
    msg.includes('requires elevation') ||
    msg.includes('ServiceCommandException') ||
    msg.includes("Impossible d'ouvrir le service")
  ) {
    throw new Error(
      'PERMISSION DENIED: You must run DevStation as Administrator to control Docker services.'
    )
  }

  if (msg.includes('Cannot find any service') || msg.includes('does not exist')) {
    throw new Error('DOCKER MISSING: Docker Desktop service not found. Is it installed?')
  }

  throw new Error(msg)
}
