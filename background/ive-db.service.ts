import { v4 } from 'uuid'
import {
  IveEntry,
  VideoSource,
  ScriptMetadata,
  CreateIveEntryData,
  IveSearchOptions,
} from '@/types/ivedb'

export class IveDBService {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'ive-database'
  private readonly DB_VERSION = 2

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db)

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = (event) => {
        console.error('IveDB error:', event)
        reject(new Error('Failed to open IveDB database'))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create entries store
        if (!db.objectStoreNames.contains('entries')) {
          const entryStore = db.createObjectStore('entries', { keyPath: 'id' })
          entryStore.createIndex('title', 'title')
          entryStore.createIndex('tags', 'tags', { multiEntry: true })
          entryStore.createIndex('createdAt', 'createdAt')
          entryStore.createIndex('duration', 'duration')
        }

        // Create video sources store
        if (!db.objectStoreNames.contains('videoSources')) {
          const videoStore = db.createObjectStore('videoSources', {
            keyPath: 'id',
          })
          videoStore.createIndex('url', 'url', { unique: true })
          videoStore.createIndex('status', 'status')
          videoStore.createIndex('createdAt', 'createdAt')
        }

        // Create scripts store
        if (!db.objectStoreNames.contains('scripts')) {
          const scriptStore = db.createObjectStore('scripts', { keyPath: 'id' })
          scriptStore.createIndex('url', 'url', { unique: true })
          scriptStore.createIndex('creator', 'creator')
          scriptStore.createIndex('avgSpeed', 'avgSpeed')
          scriptStore.createIndex('maxSpeed', 'maxSpeed')
          scriptStore.createIndex('actionCount', 'actionCount')
          scriptStore.createIndex('createdAt', 'createdAt')
        }

        // Create favorites store (just entry IDs)
        if (!db.objectStoreNames.contains('favorites')) {
          const favStore = db.createObjectStore('favorites', {
            keyPath: 'entryId',
          })
          favStore.createIndex('favoritedAt', 'favoritedAt')
        }
      }
    })
  }

  // Create a new IVE entry with related data
  async createEntry(data: CreateIveEntryData): Promise<string> {
    const db = await this.openDB()
    const tx = db.transaction(
      ['entries', 'videoSources', 'scripts'],
      'readwrite',
    )
    const now = Date.now()

    try {
      const entryId = v4()
      const videoSourceIds: string[] = []
      const scriptIds: string[] = []

      // Create video sources
      for (const videoData of data.videoSources) {
        const videoId = v4()
        const videoSource: VideoSource = {
          ...videoData,
          id: videoId,
          createdAt: now,
          updatedAt: now,
        }

        await this.promisifyRequest(
          tx.objectStore('videoSources').add(videoSource),
        )
        videoSourceIds.push(videoId)
      }

      // Create scripts
      for (const scriptData of data.scripts) {
        const scriptId = v4()
        const script: ScriptMetadata = {
          ...scriptData,
          id: scriptId,
          createdAt: now,
          updatedAt: now,
        }

        await this.promisifyRequest(tx.objectStore('scripts').add(script))
        scriptIds.push(scriptId)
      }

      // Create main entry
      const entry: IveEntry = {
        id: entryId,
        title: data.title,
        duration: data.duration,
        thumbnail: data.thumbnail,
        tags: data.tags,
        videoSourceIds,
        scriptIds,
        createdAt: now,
        updatedAt: now,
      }

      await this.promisifyRequest(tx.objectStore('entries').add(entry))

      return entryId
    } catch (error) {
      tx.abort()
      throw error
    }
  }

  // Get entry with all related data
  async getEntryWithDetails(entryId: string) {
    const db = await this.openDB()
    const tx = db.transaction(
      ['entries', 'videoSources', 'scripts'],
      'readonly',
    )

    const entry = await this.promisifyRequest(
      tx.objectStore('entries').get(entryId),
    )
    if (!entry) return null

    // Get video sources
    const videoSources: VideoSource[] = []
    for (const videoId of entry.videoSourceIds) {
      const video = await this.promisifyRequest(
        tx.objectStore('videoSources').get(videoId),
      )
      if (video) videoSources.push(video)
    }

    // Get scripts
    const scripts: ScriptMetadata[] = []
    for (const scriptId of entry.scriptIds) {
      const script = await this.promisifyRequest(
        tx.objectStore('scripts').get(scriptId),
      )
      if (script) scripts.push(script)
    }

    return {
      entry,
      videoSources,
      scripts,
    }
  }

  // Search entries
  async searchEntries(options: IveSearchOptions = {}): Promise<IveEntry[]> {
    const db = await this.openDB()
    const tx = db.transaction(['entries', 'scripts'], 'readonly')
    const entryStore = tx.objectStore('entries')

    let entries: IveEntry[] = []

    if (options.tags && options.tags.length > 0) {
      // Search by tags
      const tagIndex = entryStore.index('tags')
      const entrySet = new Set<IveEntry>()

      for (const tag of options.tags) {
        const results = await this.promisifyRequest(tagIndex.getAll(tag))
        results.forEach((entry: IveEntry) => entrySet.add(entry))
      }

      entries = Array.from(entrySet)
    } else if (options.creator) {
      // Search by creator - need to find scripts first
      const scriptIndex = tx.objectStore('scripts').index('creator')
      const scripts: ScriptMetadata[] = await this.promisifyRequest(
        scriptIndex.getAll(options.creator),
      )

      if (scripts.length > 0) {
        const allEntries: IveEntry[] = await this.promisifyRequest(
          entryStore.getAll(),
        )
        entries = allEntries.filter((entry) =>
          entry.scriptIds.some((scriptId) =>
            scripts.some((script) => script.id === scriptId),
          ),
        )
      }
    } else {
      // Get all entries
      entries = await this.promisifyRequest(entryStore.getAll())
    }

    // Apply additional filters
    if (options.query) {
      const query = options.query.toLowerCase()
      entries = entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.tags?.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    if (options.minDuration !== undefined) {
      entries = entries.filter(
        (entry) => (entry.duration || 0) >= options.minDuration!,
      )
    }

    if (options.maxDuration !== undefined) {
      entries = entries.filter(
        (entry) => (entry.duration || 0) <= options.maxDuration!,
      )
    }

    // Sort by most recent
    return entries.sort((a, b) => b.createdAt - a.createdAt)
  }

  // Get all entries (for listing)
  async getAllEntries(): Promise<IveEntry[]> {
    const db = await this.openDB()
    const tx = db.transaction(['entries'], 'readonly')
    const entries: IveEntry[] = await this.promisifyRequest(
      tx.objectStore('entries').getAll(),
    )
    return entries.sort((a, b) => b.createdAt - a.createdAt)
  }

  // Update entry
  async updateEntry(
    entryId: string,
    updates: Partial<Omit<IveEntry, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(['entries'], 'readwrite')

    const entry = await this.promisifyRequest(
      tx.objectStore('entries').get(entryId),
    )
    if (!entry) throw new Error('Entry not found')

    const updatedEntry: IveEntry = {
      ...entry,
      ...updates,
      updatedAt: Date.now(),
    }

    await this.promisifyRequest(tx.objectStore('entries').put(updatedEntry))
  }

  // Delete entry and related data
  async deleteEntry(entryId: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(
      ['entries', 'videoSources', 'scripts', 'favorites'],
      'readwrite',
    )

    const entry = await this.promisifyRequest(
      tx.objectStore('entries').get(entryId),
    )
    if (!entry) return

    // Delete related video sources and scripts
    for (const videoId of entry.videoSourceIds) {
      await this.promisifyRequest(
        tx.objectStore('videoSources').delete(videoId),
      )
    }

    for (const scriptId of entry.scriptIds) {
      await this.promisifyRequest(tx.objectStore('scripts').delete(scriptId))
    }

    // Delete from favorites if exists
    await this.promisifyRequest(tx.objectStore('favorites').delete(entryId))

    // Delete main entry
    await this.promisifyRequest(tx.objectStore('entries').delete(entryId))
  }

  // Favorites methods
  async addToFavorites(entryId: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(['favorites'], 'readwrite')
    const favorite = { entryId, favoritedAt: Date.now() }
    await this.promisifyRequest(tx.objectStore('favorites').put(favorite))
  }

  async removeFromFavorites(entryId: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(['favorites'], 'readwrite')
    await this.promisifyRequest(tx.objectStore('favorites').delete(entryId))
  }

  async getFavorites(): Promise<IveEntry[]> {
    const db = await this.openDB()
    const tx = db.transaction(['favorites', 'entries'], 'readonly')

    // Get favorite entry IDs sorted by when favorited
    const favStore = tx.objectStore('favorites')
    const favIndex = favStore.index('favoritedAt')
    const favoriteRefs = await this.promisifyRequest(favIndex.getAll())

    // Get actual entries
    const entries: IveEntry[] = []
    for (const fav of favoriteRefs.reverse()) {
      // Most recent first
      const entry = await this.promisifyRequest(
        tx.objectStore('entries').get(fav.entryId),
      )
      if (entry) entries.push(entry)
    }

    return entries
  }

  async isFavorited(entryId: string): Promise<boolean> {
    const db = await this.openDB()
    const tx = db.transaction(['favorites'], 'readonly')
    const favorite = await this.promisifyRequest(
      tx.objectStore('favorites').get(entryId),
    )
    return !!favorite
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const iveDBService = new IveDBService()
