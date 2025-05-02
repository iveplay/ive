import { ScriptEntries } from '@/types/script'

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

  async saveScripts(scripts: ScriptEntries): Promise<void> {
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
}

export const idbService = new IDBService()
