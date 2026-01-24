import { LOCAL_STORAGE_KEYS, MESSAGES } from '@background/types'
import {
  addToFavorites,
  createEntry,
  deleteEntry,
  getAllEntries,
  getEntry,
  getEntryWithDetails,
  getEntriesPaginated,
  getFavorites,
  isFavorited,
  removeFromFavorites,
  searchEntries,
  updateEntry,
  ping,
} from './iveDbUtils'

// Allow any HTTPS iveplay.io domain (including root and subdomains)
// and any localhost (any scheme/port) for development
const isAllowedOrigin = (origin: string) => {
  try {
    const url = new URL(origin)
    const { protocol, hostname } = url

    // Allow localhost on any port for development
    if (hostname === 'localhost') return true

    // Allow root and any subdomain of iveplay.io over HTTPS
    if (hostname === 'iveplay.io' || hostname.endsWith('.iveplay.io')) {
      return protocol === 'https:'
    }

    return false
  } catch {
    return false
  }
}

// Bridge between website and extension
export const setupIveBridge = () => {
  if (!isAllowedOrigin(window.location.origin)) return

  window.addEventListener('message', async (event) => {
    // Security: Only accept messages from allowed origins
    if (!isAllowedOrigin(event.origin)) return
    if (event.source !== window) return

    const message = event.data
    if (!message || message.from !== 'iveplay') return

    try {
      let response

      switch (message.type) {
        case MESSAGES.IVEDB_PING:
          response = await ping()
          break

        case MESSAGES.IVEDB_GET_ALL_ENTRIES:
          response = await getAllEntries()
          break

        case MESSAGES.IVEDB_GET_ENTRIES_PAGINATED:
          response = await getEntriesPaginated(
            message.offset,
            message.limit,
            message.options,
          )
          break

        case MESSAGES.IVEDB_GET_ENTRY:
          response = await getEntry(message.entryId)
          break

        case MESSAGES.IVEDB_GET_ENTRY_WITH_DETAILS:
          response = await getEntryWithDetails(message.entryId)
          break

        case MESSAGES.IVEDB_CREATE_ENTRY:
          response = await createEntry(message.data)
          break

        case MESSAGES.IVEDB_UPDATE_ENTRY:
          response = await updateEntry(message.entryId, message.data)
          break

        case MESSAGES.IVEDB_DELETE_ENTRY:
          response = await deleteEntry(message.entryId)
          break

        case MESSAGES.IVEDB_ADD_FAVORITE:
          response = await addToFavorites(message.entryId)
          break

        case MESSAGES.IVEDB_REMOVE_FAVORITE:
          response = await removeFromFavorites(message.entryId)
          break

        case MESSAGES.IVEDB_GET_FAVORITES:
          response = await getFavorites()
          break

        case MESSAGES.IVEDB_IS_FAVORITED:
          response = await isFavorited(message.entryId)
          break

        case MESSAGES.IVEDB_SEARCH_ENTRIES:
          response = await searchEntries(message.options)
          break

        case MESSAGES.IVE_SELECT_SCRIPT:
          await chrome.storage.local.set({
            [LOCAL_STORAGE_KEYS.IVE_PENDING_SCRIPT]: {
              scriptId: message.scriptId,
              timestamp: message.timestamp || Date.now(),
            },
          })
          response = true
          break

        case MESSAGES.IVE_SAVE_AND_PLAY: {
          // Create/update entry and select script for playback
          const { entry, videoUrl, scriptId: requestedScriptId } = message
          const entryId = await createEntry(entry)

          // Get the created entry to find the script ID
          const details = await getEntryWithDetails(entryId)
          const scriptToSelect = requestedScriptId
            ? details?.scripts.find((s) => s.id === requestedScriptId)?.id
            : details?.scripts[0]?.id

          if (scriptToSelect) {
            await chrome.storage.local.set({
              [LOCAL_STORAGE_KEYS.IVE_PENDING_SCRIPT]: {
                scriptId: scriptToSelect,
                videoUrl,
                timestamp: Date.now(),
              },
            })
          }

          response = { entryId, scriptId: scriptToSelect }
          break
        }

        // Local scripts
        case MESSAGES.LOCAL_SCRIPT_SAVE:
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.LOCAL_SCRIPT_SAVE,
            name: message.name,
            content: message.content,
            size: message.size,
          })
          break

        case MESSAGES.LOCAL_SCRIPT_GET:
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.LOCAL_SCRIPT_GET,
            scriptId: message.scriptId,
          })
          break

        case MESSAGES.LOCAL_SCRIPT_DELETE:
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.LOCAL_SCRIPT_DELETE,
            scriptId: message.scriptId,
          })
          break

        case MESSAGES.LOCAL_SCRIPT_LIST:
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.LOCAL_SCRIPT_LIST,
          })
          break

        case MESSAGES.LOCAL_SCRIPT_INFO:
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.LOCAL_SCRIPT_INFO,
            scriptId: message.scriptId,
          })
          break

        default:
          throw new Error(`Unknown message type: ${message.type}`)
      }

      // Send response back to page
      window.postMessage(
        {
          from: 'ive-extension',
          id: message.id,
          data: response,
          error: null,
        },
        event.origin,
      )
    } catch (error) {
      window.postMessage(
        {
          from: 'ive-extension',
          id: message.id,
          data: null,
          error: error instanceof Error ? error.message : String(error),
        },
        event.origin,
      )
    }
  })
}
