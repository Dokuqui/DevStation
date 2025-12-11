import { exec } from 'child_process'
import os from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
  return new Promise((resolve, reject) => {
    const isWin = os.platform() === 'win32'
    const isMac = os.platform() === 'darwin'

    let cmd = ''

    if (isWin) {
      cmd = 'net stop com.docker.service && net start com.docker.service'
    } else if (isMac) {
      cmd = 'osascript -e \'quit app "Docker"\' && open -a Docker'
    } else {
      cmd = 'sudo systemctl restart docker'
    }

    exec(cmd, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

export async function startDocker(): Promise<string> {
  const platform = os.platform()
  let cmd = ''

  if (platform === 'win32') {
    cmd = 'powershell -Command "Start-Service *docker*"'
  } else if (platform === 'darwin') {
    cmd = 'open -a Docker'
  } else {
    cmd = 'sudo systemctl start docker'
  }

  try {
    await execAsync(cmd)
    return 'Docker started'
  } catch (err) {
    throw new Error(`Failed to start Docker: ${(err as Error).message}`)
  }
}

export async function stopDocker(): Promise<string> {
  const platform = os.platform()
  let cmd = ''

  if (platform === 'win32') {
    cmd = 'powershell -Command "Stop-Service *docker* -Force"'
  } else if (platform === 'darwin') {
    cmd = 'osascript -e \'quit app "Docker"\''
  } else {
    cmd = 'sudo systemctl stop docker'
  }

  try {
    await execAsync(cmd)
    return 'Docker stopped'
  } catch (err) {
    throw new Error(`Failed to stop Docker: ${(err as Error).message}`)
  }
}

export async function dockerPrune(): Promise<string> {
  try {
    await execAsync('docker system prune -af --volumes')
    return 'Docker pruned (unused containers, images, volumes removed)'
  } catch (err) {
    throw new Error(`Docker prune failed: ${(err as Error).message}`)
  }
}

export async function dockerComposeUp(cwd: string): Promise<string> {
  try {
    await execAsync('docker-compose up -d', { cwd })
    return 'docker-compose up -d executed'
  } catch (err) {
    throw new Error(`docker-compose up failed: ${(err as Error).message}`)
  }
}

export async function dockerComposeDown(cwd: string): Promise<string> {
  try {
    await execAsync('docker-compose down', { cwd })
    return 'docker-compose down executed'
  } catch (err) {
    throw new Error(`docker-compose down failed: ${(err as Error).message}`)
  }
}
