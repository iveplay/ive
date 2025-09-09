import { MESSAGES } from '@background/types'
import {
  CreateIveEntryData,
  IveEntry,
  IveSearchOptions,
  VideoSource,
  ScriptMetadata,
} from '@/types/ivedb'

export const ping = async (): Promise<boolean> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_PING,
    })
  } catch (error) {
    console.error('Error pinging IveDB:', error)
    return false
  }
}

export const getEntriesPaginated = async (
  offset: number = 0,
  limit: number = 20,
): Promise<IveEntry[]> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_ENTRIES_PAGINATED,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Error getting paginated IveDB entries:', error)
    throw error
  }
}

export const getEntry = async (entryId: string): Promise<IveEntry | null> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_ENTRY,
      entryId,
    })
  } catch (error) {
    console.error('Error getting IveDB entry:', error)
    throw error
  }
}

export const getEntryWithDetails = async (
  entryId: string,
): Promise<{
  entry: IveEntry
  videoSources: VideoSource[]
  scripts: ScriptMetadata[]
} | null> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_ENTRY_WITH_DETAILS,
      entryId,
    })
  } catch (error) {
    console.error('Error getting IveDB entry with details:', error)
    throw error
  }
}

// Existing methods remain the same
export const createEntry = async (
  data: CreateIveEntryData,
): Promise<string> => {
  try {
    const entryId = await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_CREATE_ENTRY,
      data,
    })
    return entryId
  } catch (error) {
    console.error('Error creating IveDB entry:', error)
    throw error
  }
}

export const getAllEntries = async (): Promise<IveEntry[]> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_ALL_ENTRIES,
    })
  } catch (error) {
    console.error('Error getting all IveDB entries:', error)
    throw error
  }
}

export const searchEntries = async (
  options: IveSearchOptions = {},
): Promise<IveEntry[]> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_SEARCH_ENTRIES,
      options,
    })
  } catch (error) {
    console.error('Error searching IveDB entries:', error)
    throw error
  }
}

export const updateEntry = async (
  entryId: string,
  updates: Partial<Omit<IveEntry, 'id' | 'createdAt'>>,
): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_UPDATE_ENTRY,
      entryId,
      updates,
    })
  } catch (error) {
    console.error('Error updating IveDB entry:', error)
    throw error
  }
}

export const deleteEntry = async (entryId: string): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_DELETE_ENTRY,
      entryId,
    })
  } catch (error) {
    console.error('Error deleting IveDB entry:', error)
    throw error
  }
}

export const addToFavorites = async (entryId: string): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_ADD_FAVORITE,
      entryId,
    })
  } catch (error) {
    console.error('Error adding to favorites:', error)
    throw error
  }
}

export const removeFromFavorites = async (entryId: string): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_REMOVE_FAVORITE,
      entryId,
    })
  } catch (error) {
    console.error('Error removing from favorites:', error)
    throw error
  }
}

export const getFavorites = async (): Promise<IveEntry[]> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_FAVORITES,
    })
  } catch (error) {
    console.error('Error getting favorites:', error)
    throw error
  }
}

export const isFavorited = async (entryId: string): Promise<boolean> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_IS_FAVORITED,
      entryId,
    })
  } catch (error) {
    console.error('Error checking if favorited:', error)
    return false
  }
}

export const findEntryByVideoUrl = async (
  url: string,
): Promise<IveEntry | null> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_FIND_BY_VIDEO_URL,
      url,
    })
  } catch (error) {
    console.error('Error finding entry by video URL:', error)
    return null
  }
}

export const findEntryByScriptUrl = async (
  url: string,
): Promise<IveEntry | null> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_FIND_BY_SCRIPT_URL,
      url,
    })
  } catch (error) {
    console.error('Error finding entry by script URL:', error)
    return null
  }
}

export const getVideoLookups = async (): Promise<
  { url: string; entryId: string }[]
> => {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGES.IVEDB_GET_VIDEO_LOOKUPS,
    })
  } catch (error) {
    console.error('Error getting video lookups:', error)
    return []
  }
}
