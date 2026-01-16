import { safeStorage } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { getStore } from '../store'

interface EncryptedSecret {
  id: string
  label: string
  value: string
  category: 'api' | 'ssh' | 'db' | 'other'
}

export class VaultService {
  async getEnvFile(projectPath: string): Promise<string> {
    const envPath = path.join(projectPath, '.env')
    try {
      const content = await fs.readFile(envPath, 'utf-8')
      return content
    } catch {
      try {
        const example = await fs.readFile(path.join(projectPath, '.env.example'), 'utf-8')
        return `\\# Created from .env.example\n${example}`
      } catch {
        return ''
      }
    }
  }

  async saveEnvFile(projectPath: string, content: string): Promise<boolean> {
    try {
      await fs.writeFile(path.join(projectPath, '.env'), content, 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save .env:', error)
      return false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSecrets(): Promise<any[]> {
    const store = await getStore()
    const secrets = (store.get('vault.secrets') as EncryptedSecret[]) || []

    return secrets.map((s) => ({
      ...s,
      isEncrypted: true
    }))
  }

  async addSecret(label: string, value: string, category: string = 'other'): Promise<boolean> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS Encryption is not available')
    }

    const encryptedBuffer = safeStorage.encryptString(value)
    const hexString = encryptedBuffer.toString('hex')

    const store = await getStore()
    const secrets = (store.get('vault.secrets') as EncryptedSecret[]) || []

    const newSecret: EncryptedSecret = {
      id: crypto.randomUUID(),
      label,
      value: hexString,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      category
    }

    store.set('vault.secrets', [...secrets, newSecret])
    return true
  }

  async revealSecret(id: string): Promise<string | null> {
    const store = await getStore()
    const secrets = (store.get('vault.secrets') as EncryptedSecret[]) || []
    const secret = secrets.find((s) => s.id === id)

    if (!secret) return null

    try {
      const buffer = Buffer.from(secret.value, 'hex')
      const decrypted = safeStorage.decryptString(buffer)
      return decrypted
    } catch (error) {
      console.error('Failed to decrypt:', error)
      return 'ERROR: Could not decrypt'
    }
  }

  async deleteSecret(id: string): Promise<boolean> {
    const store = await getStore()
    const secrets = (store.get('vault.secrets') as EncryptedSecret[]) || []
    const filtered = secrets.filter((s) => s.id !== id)
    store.set('vault.secrets', filtered)
    return true
  }
}

export const vaultService = new VaultService()
