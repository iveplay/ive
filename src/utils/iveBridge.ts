import { MESSAGES } from '@background/types'

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
    if (!message || message.from !== 'iveplay-page') return

    try {
      let response

      switch (message.type) {
        case 'IVEDB_GET_ALL_ENTRIES':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_GET_ALL_ENTRIES,
          })
          break

        case 'IVEDB_GET_ENTRY':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_GET_ENTRY,
            entryId: message.entryId,
          })
          break

        case 'IVEDB_CREATE_ENTRY':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_CREATE_ENTRY,
            data: message.data,
          })
          break

        case 'IVEDB_UPDATE_ENTRY':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_UPDATE_ENTRY,
            entryId: message.entryId,
            updates: message.updates,
          })
          break

        case 'IVEDB_DELETE_ENTRY':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_DELETE_ENTRY,
            entryId: message.entryId,
          })
          break

        case 'IVEDB_ADD_FAVORITE':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_ADD_FAVORITE,
            entryId: message.entryId,
          })
          break

        case 'IVEDB_REMOVE_FAVORITE':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_REMOVE_FAVORITE,
            entryId: message.entryId,
          })
          break

        case 'IVEDB_GET_FAVORITES':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_GET_FAVORITES,
          })
          break

        case 'IVEDB_IS_FAVORITED':
          response = await chrome.runtime.sendMessage({
            type: MESSAGES.IVEDB_IS_FAVORITED,
            entryId: message.entryId,
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
