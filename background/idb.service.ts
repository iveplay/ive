import { ScriptEntries, ScriptInfo } from '@/types/script'

export class IDBService {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'ive-storage'
  private readonly SCRIPTS_STORE = 'scripts'
  private readonly DB_VERSION = 1

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db)

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = (event) => {
        console.error('IndexedDB error:', event)
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.SCRIPTS_STORE)) {
          db.createObjectStore(this.SCRIPTS_STORE)
        }
      }
    })
  }

  async getScripts(): Promise<ScriptEntries> {
    try {
      const db = await this.openDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.SCRIPTS_STORE], 'readonly')
        const store = transaction.objectStore(this.SCRIPTS_STORE)
        const request = store.get('scripts')

        request.onerror = () => reject(new Error('Failed to get scripts'))
        request.onsuccess = () => resolve(request.result || {})
      })
    } catch (error) {
      console.error('Error getting scripts:', error)
      return {}
    }
  }

  private async _saveScripts(scripts: ScriptEntries): Promise<void> {
    try {
      const db = await this.openDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.SCRIPTS_STORE], 'readwrite')
        const store = transaction.objectStore(this.SCRIPTS_STORE)
        const request = store.put(scripts, 'scripts')

        request.onerror = () => reject(new Error('Failed to save scripts'))
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('Error saving scripts:', error)
      throw error
    }
  }

  async saveScript(
    websiteKey: string,
    scriptId: string,
    scriptInfo: ScriptInfo,
  ): Promise<void> {
    try {
      // Get current scripts
      const currentScripts = await this.getScripts()

      // Initialize the website entry if it doesn't exist
      if (!currentScripts[websiteKey]) {
        currentScripts[websiteKey] = {}
      }

      // If the new script is default, set all other scripts for this website to non-default
      if (scriptInfo.isDefault) {
        Object.keys(currentScripts[websiteKey]).forEach((id) => {
          if (id !== scriptId) {
            currentScripts[websiteKey][id].isDefault = false
          }
        })
      }

      // Add/update the script
      currentScripts[websiteKey][scriptId] = scriptInfo

      // Save the updated scripts object
      return this._saveScripts(currentScripts)
    } catch (error) {
      console.error(`Error saving script ${scriptId} for ${websiteKey}:`, error)
      throw error
    }
  }
}

export const idbService = new IDBService()
