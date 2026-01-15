import { useState, useEffect, JSX } from 'react'
import styles from './Settings.module.scss'
import { Terminal, Monitor, ShieldAlert, Folder, Moon, Sun, RefreshCw } from 'lucide-react'

export function Settings(): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    const s = await window.api.getSettings()
    setSettings(s || {})
  }

  const handleChange = (key: string, value: unknown): void => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    window.api.setSetting(key, value)

    if (key === 'theme') {
      document.body.classList.toggle('light-mode', value === 'light')
      window.api.updateTheme(value as 'light' | 'dark')
    }
  }

  const handleSelectFolder = async (): Promise<void> => {
    const path = await window.api.selectFolder()
    if (path) handleChange('defaultPath', path)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Settings</h1>
      </header>

      <div className={styles.scrollArea}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Monitor size={20} />
            <h2>General & Appearance</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.label}>
                <span>App Theme</span>
                <small>Select your preferred visual mode.</small>
              </div>
              <div className={styles.toggleGroup}>
                <button
                  className={`${styles.toggleBtn} ${settings.theme === 'dark' ? styles.active : ''}`}
                  onClick={() => handleChange('theme', 'dark')}
                >
                  <Moon size={14} /> Dark
                </button>
                <button
                  className={`${styles.toggleBtn} ${settings.theme === 'light' ? styles.active : ''}`}
                  onClick={() => handleChange('theme', 'light')}
                >
                  <Sun size={14} /> Light
                </button>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div className={styles.label}>
                <span>Default Project Path</span>
                <small>New repositories will be cloned here.</small>
              </div>
              <div className={styles.inputWithAction}>
                <input value={settings.defaultPath || ''} readOnly />
                <button onClick={handleSelectFolder}>
                  <Folder size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Terminal size={20} />
            <h2>Terminal Configuration</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.label}>
                <span>Shell Path</span>
                <small>e.g., /bin/zsh, /bin/bash, or powershell.exe</small>
              </div>
              <input
                className={styles.textInput}
                value={settings.terminalShell || ''}
                onChange={(e) => handleChange('terminalShell', e.target.value)}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div className={styles.label}>
                <span>Font Size (px)</span>
              </div>
              <input
                type="number"
                className={styles.numberInput}
                value={settings.terminalFontSize || 14}
                onChange={(e) => handleChange('terminalFontSize', parseInt(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <ShieldAlert size={20} />
            <h2>Safety & Confirmations</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.label}>
                <span>Confirm Process Kill</span>
                <small>Show a warning before killing a running process/script.</small>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.confirmKill ?? true}
                  onChange={(e) => handleChange('confirmKill', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Folder size={20} />
            <h2>Projects & Scanning</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.label}>
                <span>Ignored Folders</span>
                <small>Comma-separated list of folders to skip during scan.</small>
              </div>
              <input
                className={styles.textInput}
                placeholder="node_modules, dist, .git"
                value={settings.ignoredFolders || 'node_modules,dist,.git,build'}
                onChange={(e) => handleChange('ignoredFolders', e.target.value)}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div className={styles.label}>
                <span>Default Editor</span>
                <small>Skip the menu and always open projects with...</small>
              </div>
              <select
                className={styles.selectInput}
                value={settings.defaultEditor || 'ask'}
                onChange={(e) => handleChange('defaultEditor', e.target.value)}
              >
                <option value="ask">Always Ask</option>
                <option value="vscode">VS Code</option>
                <option value="cursor">Cursor</option>
                <option value="webstorm">WebStorm</option>
                <option value="pycharm">PyCharm</option>
                <option value="sublime">Sublime Text</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <RefreshCw size={20} />
            <h2>Git Automation</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.label}>
                <span>Auto-Fetch Background</span>
                <small>Automatically check for remote updates every 15 mins.</small>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.gitAutoFetch ?? false}
                  onChange={(e) => handleChange('gitAutoFetch', e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
