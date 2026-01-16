import { shell } from 'electron'
import http from 'http'
import { getStore } from './store'

const CLIENT_ID = import.meta.env.MAIN_VITE_GITHUB_CLIENT_ID
const CLIENT_SECRET = import.meta.env.MAIN_VITE_GITHUB_CLIENT_SECRET
const REDIRECT_URI =
  import.meta.env.MAIN_VITE_GITHUB_REDIRECT_URI || 'http://localhost:4200/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '[GitHub] Missing credentials! Check your .env file for MAIN_VITE_GITHUB_CLIENT_ID and MAIN_VITE_GITHUB_CLIENT_SECRET'
  )
}

export const loginWithGitHub = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost:4200`)

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')

        if (code) {
          try {
            const token = await exchangeCodeForToken(code)
            if (token) {
              const store = await getStore()
              store.set('github_token', token)
              res.end('<h1>Login Successful! You can close this tab and return to DevStation.</h1>')
              resolve(true)
            } else {
              throw new Error('No token returned')
            }
          } catch (err) {
            res.end('<h1>Login Failed. See app for details.</h1>')
            reject(err)
          }
        }
        server.close()
      }
    })

    server.listen(4200, () => {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${REDIRECT_URI}`
      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      reject(err)
      server.close()
    })
  })
}

const exchangeCodeForToken = async (code: string): Promise<string | null> => {
  const body = JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code
  })

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body
  })

  const data = await response.json()
  return data.access_token || null
}

export const getGitHubRepos = async (): Promise<void> => {
  const store = await getStore()
  const token = store.get('github_token')
  if (!token) throw new Error('Not logged in')

  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      store.delete('github_token')
      throw new Error('Session expired. Please login again.')
    }
    throw new Error('Failed to fetch repositories')
  }

  return await response.json()
}

export const isGitHubLoggedIn = async (): Promise<boolean> => {
  const store = await getStore()
  return !!store.get('github_token')
}

export const logoutGitHub = async (): Promise<boolean> => {
  const store = await getStore()
  store.delete('github_token')
  return true
}
