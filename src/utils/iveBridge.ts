import { MESSAGES } from '@background/types'
import {
  addToFavorites,
  createEntry,
  deleteEntry,
  getAllEntries,
  getEntry,
  getFavorites,
  isFavorited,
  removeFromFavorites,
  searchEntries,
  updateEntry,
} from './iveDbUtils'

const ALLOWED_ORIGIN =
  process.env.NODE_ENV === 'development'
    ? 'https://iveplay.io'
    : 'http://localhost:3000'

// Bridge between website and extension
export const setupIveBridge = () => {
  window.addEventListener('message', async (event) => {
    // Security: Only accept messages from allowed origins
    if (event.origin !== ALLOWED_ORIGIN) return
    if (event.source !== window) return

    const message = event.data
    if (!message || message.from !== 'iveplay') return

    try {
      let response

      switch (message.type) {
        case MESSAGES.IVEDB_GET_ALL_ENTRIES:
          response = await getAllEntries()
          break

        case MESSAGES.IVEDB_GET_ENTRY:
          response = await getEntry(message.entryId)
          break

        case MESSAGES.IVEDB_CREATE_ENTRY:
          response = await createEntry(message.data)
          break

        case MESSAGES.IVEDB_UPDATE_ENTRY:
          response = await updateEntry(message.entryId, message.updates)
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
