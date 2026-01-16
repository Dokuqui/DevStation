import simpleGit, {
  FetchResult,
  FileStatusResult,
  PullResult,
  PushResult,
  SimpleGit,
  SimpleGitOptions,
  TaskOptions
} from 'simple-git'

const getGit = (path: string): SimpleGit => {
  const options: Partial<SimpleGitOptions> = {
    baseDir: path,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false
  }
  return simpleGit(options)
}

export const cloneRepository = async (
  url: string,
  parentPath: string,
  shallow = false
): Promise<string> => {
  const git = simpleGit(parentPath)

  const repoName = url.split('/').pop()?.replace('.git', '') || 'repository'
  const finalPath = `${parentPath}/${repoName}`

  const options: TaskOptions = {}

  if (shallow) {
    options['--depth'] = 1
  }

  try {
    await git.clone(url, finalPath, options)
    return finalPath
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new Error(`Clone failed: ${err.message}`)
  }
}

export const getGitStatus = async (
  path: string
): Promise<{
  isRepo: boolean
  currentBranch: string | null
  branches: string[]
  behind: number
  ahead: number
  files: FileStatusResult[]
} | null> => {
  const git = getGit(path)
  try {
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return null

    const status = await git.status()
    const branchSummary = await git.branchLocal()

    return {
      isRepo: true,
      currentBranch: status.current,
      branches: branchSummary.all,
      behind: status.behind,
      ahead: status.ahead,
      files: status.files
    }
  } catch (e) {
    console.error('Git status error:', e)
    return null
  }
}

export const gitPull = async (path: string): Promise<PullResult> => {
  const git = getGit(path)
  return await git.pull()
}

export const gitPush = async (path: string): Promise<PushResult> => {
  const git = getGit(path)
  return await git.push()
}

export const gitCheckout = async (path: string, branch: string): Promise<string> => {
  const git = getGit(path)
  return await git.checkout(branch)
}

export const gitFetch = async (path: string): Promise<FetchResult> => {
  const git = getGit(path)
  return await git.fetch()
}

export const gitCommit = async (path: string, message: string): Promise<void> => {
  const git = getGit(path)
  try {
    await git.add('.')
    await git.commit(message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new Error(`Commit failed: ${err.message}`)
  }
}

export const gitStash = async (path: string): Promise<void> => {
  const git = getGit(path)
  try {
    await git.stash()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new Error(`Stash failed: ${err.message}`)
  }
}
