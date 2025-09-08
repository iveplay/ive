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
  private readonly DB_VERSION = 3
  private initPromise: Promise<IDBDatabase> | null = null

  async openDB(): Promise<IDBDatabase> {
    // Return existing connection if available
    if (this.db && this.db.objectStoreNames.length > 0) {
      return Promise.resolve(this.db)
    }

    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Create new initialization promise
    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = (event) => {
        console.error('IveDB error:', event)
        this.initPromise = null
        reject(new Error('Failed to open IveDB database'))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result

        // Handle unexpected database close
        this.db.onclose = () => {
          console.warn('IveDB connection closed unexpectedly')
          this.db = null
          this.initPromise = null
        }

        this.db.onerror = (event) => {
          console.error('IveDB connection error:', event)
        }

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

        // Create URL lookup tables for quick matching
        if (!db.objectStoreNames.contains('videoUrlLookup')) {
          const videoLookupStore = db.createObjectStore('videoUrlLookup', {
            keyPath: 'url',
          })
          videoLookupStore.createIndex('entryId', 'entryId')
        }

        if (!db.objectStoreNames.contains('scriptUrlLookup')) {
          const scriptLookupStore = db.createObjectStore('scriptUrlLookup', {
            keyPath: 'url',
          })
          scriptLookupStore.createIndex('entryId', 'entryId')
        }
      }
    })

    return this.initPromise
  }

  // Find entries that share video or script URLs with the new data
  private async findRelatedEntries(
    data: CreateIveEntryData,
  ): Promise<Set<string>> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

    const tx = db.transaction(['videoUrlLookup', 'scriptUrlLookup'], 'readonly')
    const relatedEntryIds = new Set<string>()

    try {
      // Check video URLs
      for (const videoData of data.videoSources) {
        const lookup = await this.promisifyRequest(
          tx.objectStore('videoUrlLookup').get(videoData.url),
        )
        if (lookup) {
          relatedEntryIds.add(lookup.entryId)
        }
      }

      // Check script URLs
      for (const scriptData of data.scripts) {
        const lookup = await this.promisifyRequest(
          tx.objectStore('scriptUrlLookup').get(scriptData.url),
        )
        if (lookup) {
          relatedEntryIds.add(lookup.entryId)
        }
      }

      return relatedEntryIds
    } catch (error) {
      console.error('Error finding related entries:', error)
      throw error
    }
  }

  async ping(): Promise<boolean> {
    const db = await this.openDB()
    return db && db.objectStoreNames.length > 0
  }

  async getEntriesPaginated(
    offset: number = 0,
    limit: number = 20,
  ): Promise<IveEntry[]> {
    const db = await this.openDB()

    if (!db || db.objectStoreNames.length === 0) {
      return []
    }

    const tx = db.transaction(['entries'], 'readonly')
    const store = tx.objectStore('entries')
    const index = store.index('createdAt')

    // Use cursor for efficient pagination
    const entries: IveEntry[] = []
    let skipped = 0

    return new Promise((resolve, reject) => {
      // Open cursor in descending order (newest first)
      const request = index.openCursor(null, 'prev')

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result

        if (!cursor) {
          resolve(entries)
          return
        }

        if (skipped < offset) {
          skipped++
          cursor.continue()
          return
        }

        if (entries.length >= limit) {
          resolve(entries)
          return
        }

        entries.push(cursor.value)
        cursor.continue()
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getBasicEntry(entryId: string): Promise<IveEntry | null> {
    const db = await this.openDB()

    if (!db || db.objectStoreNames.length === 0) {
      return null
    }

    const tx = db.transaction(['entries'], 'readonly')
    return await this.promisifyRequest(tx.objectStore('entries').get(entryId))
  }

  async getEntryWithDetails(entryId: string): Promise<{
    entry: IveEntry
    videoSources: VideoSource[]
    scripts: ScriptMetadata[]
  } | null> {
    const db = await this.openDB()

    if (!db || db.objectStoreNames.length === 0) {
      return null
    }

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

  // Enhanced search with pagination
  async searchEntriesPaginated(
    options: IveSearchOptions & { offset?: number; limit?: number } = {},
  ): Promise<IveEntry[]> {
    const { offset = 0, limit = 20, ...searchOptions } = options

    // Get all matching entries first (could be optimized further)
    const allResults = await this.searchEntries(searchOptions)

    // Apply pagination
    return allResults.slice(offset, offset + limit)
  }

  // Get entry count for pagination info
  async getEntriesCount(options?: IveSearchOptions): Promise<number> {
    if (options && (options.tags?.length || options.creator || options.query)) {
      const results = await this.searchEntries(options)
      return results.length
    }

    const db = await this.openDB()

    if (!db || db.objectStoreNames.length === 0) {
      return 0
    }

    const tx = db.transaction(['entries'], 'readonly')

    return new Promise((resolve, reject) => {
      const request = tx.objectStore('entries').count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Create a new IVE entry with related data or merge with existing
  async createEntry(data: CreateIveEntryData): Promise<string> {
    try {
      // Find any existing entries that share URLs
      const relatedEntryIds = await this.findRelatedEntries(data)

      if (relatedEntryIds.size > 0) {
        // Merge with the first related entry
        const targetEntryId = Array.from(relatedEntryIds)[0]
        return await this.mergeWithExistingEntry(targetEntryId, data)
      }

      // No related entries, create new one
      const db = await this.openDB()

      // Check if database is still valid
      if (!db || db.objectStoreNames.length === 0) {
        throw new Error('Database connection invalid')
      }

      const now = Date.now()
      const entryId = v4()
      const videoSourceIds: string[] = []
      const scriptIds: string[] = []

      // Single transaction for all operations
      const tx = db.transaction(
        [
          'entries',
          'videoSources',
          'scripts',
          'videoUrlLookup',
          'scriptUrlLookup',
        ],
        'readwrite',
      )

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
        await this.promisifyRequest(
          tx.objectStore('videoUrlLookup').add({
            url: videoData.url,
            entryId,
          }),
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
        await this.promisifyRequest(
          tx.objectStore('scriptUrlLookup').add({
            url: scriptData.url,
            entryId,
          }),
        )

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
      console.error('Error creating entry:', error)
      throw error
    }
  }

  // Merge new data with existing entry
  private async mergeWithExistingEntry(
    entryId: string,
    data: CreateIveEntryData,
  ): Promise<string> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

    const now = Date.now()

    // Get existing entry
    const entryDetails = await this.getEntryWithDetails(entryId)
    if (!entryDetails) {
      throw new Error('Target entry not found for merge')
    }

    const existingVideoUrls = new Set(
      entryDetails.videoSources.map((v) => v.url),
    )
    const existingScriptUrls = new Set(entryDetails.scripts.map((s) => s.url))

    const newVideoSourceIds = [...entryDetails.entry.videoSourceIds]
    const newScriptIds = [...entryDetails.entry.scriptIds]

    // Single transaction for all merge operations
    const tx = db.transaction(
      [
        'entries',
        'videoSources',
        'scripts',
        'videoUrlLookup',
        'scriptUrlLookup',
      ],
      'readwrite',
    )

    // Add new video sources (only if URL doesn't exist)
    for (const videoData of data.videoSources) {
      if (!existingVideoUrls.has(videoData.url)) {
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
        await this.promisifyRequest(
          tx.objectStore('videoUrlLookup').add({
            url: videoData.url,
            entryId,
          }),
        )

        newVideoSourceIds.push(videoId)
      }
    }

    // Handle scripts - override existing ones with same URL
    for (const scriptData of data.scripts) {
      if (existingScriptUrls.has(scriptData.url)) {
        // Find and update existing script
        const existingScript = entryDetails.scripts.find(
          (s) => s.url === scriptData.url,
        )
        if (existingScript) {
          const updatedScript: ScriptMetadata = {
            ...existingScript,
            ...scriptData,
            id: existingScript.id,
            createdAt: existingScript.createdAt,
            updatedAt: now,
          }

          await this.promisifyRequest(
            tx.objectStore('scripts').put(updatedScript),
          )
        }
      } else {
        // Add new script
        const scriptId = v4()
        const script: ScriptMetadata = {
          ...scriptData,
          id: scriptId,
          createdAt: now,
          updatedAt: now,
        }

        await this.promisifyRequest(tx.objectStore('scripts').add(script))
        await this.promisifyRequest(
          tx.objectStore('scriptUrlLookup').add({
            url: scriptData.url,
            entryId,
          }),
        )

        newScriptIds.push(scriptId)
      }
    }

    // Update entry - override title, thumbnail, duration, and merge tags
    const existingTags = entryDetails.entry.tags || []
    const newTags = data.tags || []
    const mergedTags = [...new Set([...existingTags, ...newTags])]

    const updatedEntry: IveEntry = {
      ...entryDetails.entry,
      title: data.title,
      duration: data.duration,
      thumbnail: data.thumbnail,
      videoSourceIds: newVideoSourceIds,
      scriptIds: newScriptIds,
      tags: mergedTags,
      updatedAt: now,
    }

    await this.promisifyRequest(tx.objectStore('entries').put(updatedEntry))

    return entryId
  }

  // Quick lookup for entries by video URL
  async findEntryByVideoUrl(url: string): Promise<IveEntry | null> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return null
    }

    const tx = db.transaction(['videoUrlLookup', 'entries'], 'readonly')

    const lookup = await this.promisifyRequest(
      tx.objectStore('videoUrlLookup').get(url),
    )

    if (!lookup) return null

    return await this.promisifyRequest(
      tx.objectStore('entries').get(lookup.entryId),
    )
  }

  // Quick lookup for entries by script URL
  async findEntryByScriptUrl(url: string): Promise<IveEntry | null> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return null
    }

    const tx = db.transaction(['scriptUrlLookup', 'entries'], 'readonly')

    const lookup = await this.promisifyRequest(
      tx.objectStore('scriptUrlLookup').get(url),
    )

    if (!lookup) return null

    return await this.promisifyRequest(
      tx.objectStore('entries').get(lookup.entryId),
    )
  }

  // Get all video URL lookups
  async getAllVideoLookups(): Promise<{ url: string; entryId: string }[]> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return []
    }

    const tx = db.transaction(['videoUrlLookup'], 'readonly')

    return await this.promisifyRequest(
      tx.objectStore('videoUrlLookup').getAll(),
    )
  }

  // Search entries
  async searchEntries(options: IveSearchOptions = {}): Promise<IveEntry[]> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return []
    }

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

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return []
    }

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

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

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

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

    const tx = db.transaction(
      [
        'entries',
        'videoSources',
        'scripts',
        'favorites',
        'videoUrlLookup',
        'scriptUrlLookup',
      ],
      'readwrite',
    )

    const entry = await this.promisifyRequest(
      tx.objectStore('entries').get(entryId),
    )
    if (!entry) return

    // Check if video sources or scripts are used by other entries before deleting
    const allEntries: IveEntry[] = await this.promisifyRequest(
      tx.objectStore('entries').getAll(),
    )
    const otherEntries = allEntries.filter((e) => e.id !== entryId)

    // Delete video sources and lookup entries only if not used by other entries
    for (const videoId of entry.videoSourceIds) {
      const isUsedElsewhere = otherEntries.some((e) =>
        e.videoSourceIds.includes(videoId),
      )
      if (!isUsedElsewhere) {
        const video = await this.promisifyRequest(
          tx.objectStore('videoSources').get(videoId),
        )
        if (video) {
          await this.promisifyRequest(
            tx.objectStore('videoSources').delete(videoId),
          )
          await this.promisifyRequest(
            tx.objectStore('videoUrlLookup').delete(video.url),
          )
        }
      }
    }

    // Delete scripts and lookup entries only if not used by other entries
    for (const scriptId of entry.scriptIds) {
      const isUsedElsewhere = otherEntries.some((e) =>
        e.scriptIds.includes(scriptId),
      )
      if (!isUsedElsewhere) {
        const script = await this.promisifyRequest(
          tx.objectStore('scripts').get(scriptId),
        )
        if (script) {
          await this.promisifyRequest(
            tx.objectStore('scripts').delete(scriptId),
          )
          await this.promisifyRequest(
            tx.objectStore('scriptUrlLookup').delete(script.url),
          )
        }
      }
    }

    // Delete from favorites if exists
    await this.promisifyRequest(tx.objectStore('favorites').delete(entryId))

    // Delete main entry
    await this.promisifyRequest(tx.objectStore('entries').delete(entryId))
  }

  // Favorites methods
  async addToFavorites(entryId: string): Promise<void> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

    const tx = db.transaction(['favorites'], 'readwrite')
    const favorite = { entryId, favoritedAt: Date.now() }
    await this.promisifyRequest(tx.objectStore('favorites').put(favorite))
  }

  async removeFromFavorites(entryId: string): Promise<void> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      throw new Error('Database connection invalid')
    }

    const tx = db.transaction(['favorites'], 'readwrite')
    await this.promisifyRequest(tx.objectStore('favorites').delete(entryId))
  }

  async getFavorites(): Promise<IveEntry[]> {
    const db = await this.openDB()

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return []
    }

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

    // Check if database is still valid
    if (!db || db.objectStoreNames.length === 0) {
      return false
    }

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
