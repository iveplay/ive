import { v4 } from 'uuid'
import { DB_LOCAL_SCRIPTS } from './types'

interface LocalScript {
  id: string
  name: string
  content: Record<string, unknown>
  size: number
  createdAt: number
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

class LocalScriptsService {
  private readonly STORAGE_KEY = DB_LOCAL_SCRIPTS

  async saveScript(
    name: string,
    content: Record<string, unknown>,
    size: number,
  ): Promise<string> {
    if (size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 2MB limit')
    }

    const scriptId = v4()

    const script: LocalScript = {
      id: scriptId,
      name,
      content,
      size,
      createdAt: Date.now(),
    }

    const scripts = await this.getAllScripts()
    scripts[scriptId] = script

    await chrome.storage.local.set({ [this.STORAGE_KEY]: scripts })

    return scriptId
  }

  async getScript(scriptId: string): Promise<Record<string, unknown> | null> {
    const scripts = await this.getAllScripts()
    const script = scripts[scriptId]

    if (!script) return null

    return script.content
  }

  async deleteScript(scriptId: string): Promise<void> {
    const scripts = await this.getAllScripts()
    delete scripts[scriptId]
    await chrome.storage.local.set({ [this.STORAGE_KEY]: scripts })
  }

  async getAllScripts(): Promise<Record<string, LocalScript>> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY)
    return result[this.STORAGE_KEY] || {}
  }

  async getScriptInfo(scriptId: string): Promise<LocalScript | null> {
    const scripts = await this.getAllScripts()
    return scripts[scriptId] || null
  }
}

export const localScriptsService = new LocalScriptsService()
