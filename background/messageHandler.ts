import { iveDBService } from './ive-db.service'
import { deviceService } from './service'
import { MESSAGES, UIMessage } from './types'

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: UIMessage, sender, sendResponse) => {
      console.log(
        'Background received message:',
        message.type,
        'from tab:',
        sender.tab?.id,
      )

      const handleAsyncOperation = async () => {
        try {
          switch (message.type) {
            case MESSAGES.GET_STATE:
              return deviceService.getState()

            case MESSAGES.GET_DEVICE_INFO:
              return deviceService.getDeviceInfo()

            case MESSAGES.AUTO_CONNECT:
              return await deviceService.autoConnect()

            case MESSAGES.HANDY_CONNECT:
              return await deviceService.connectHandy(message.connectionKey)

            case MESSAGES.HANDY_DISCONNECT:
              return await deviceService.disconnectHandy()

            case MESSAGES.HANDY_SET_OFFSET:
              return await deviceService.updateHandySettings({
                offset: message.offset,
              })

            case MESSAGES.HANDY_SET_STROKE_SETTINGS:
              return await deviceService.updateHandySettings({
                stroke: { min: message.min, max: message.max },
              })

            case MESSAGES.BUTTPLUG_CONNECT:
              return await deviceService.connectButtplug(message.serverUrl)

            case MESSAGES.BUTTPLUG_DISCONNECT:
              return await deviceService.disconnectButtplug()

            case MESSAGES.BUTTPLUG_SCAN:
              return await deviceService.scanForButtplugDevices()

            case MESSAGES.BUTTPLUG_SET_STROKE_SETTINGS:
              return await deviceService.updateButtplugSettings({
                stroke: { min: message.min, max: message.max },
              })

            case MESSAGES.LOAD_SCRIPT_URL:
              return await deviceService.loadScriptFromUrl(message.url, sender)

            case MESSAGES.LOAD_SCRIPT_CONTENT:
              return await deviceService.loadScriptFromContent(
                message.content,
                sender,
              )
            case MESSAGES.TOGGLE_SCRIPT_INVERSION:
              return await deviceService.toggleScriptInversion(sender)

            // Video playback controls - now with sender info
            case MESSAGES.PLAY:
              return await deviceService.play(
                message.timeMs,
                message.playbackRate,
                message.duration,
                message.loop,
                sender,
              )

            case MESSAGES.STOP:
              return await deviceService.stop(sender)

            case MESSAGES.RATE_CHANGE:
              return await deviceService.setPlaybackRate(
                message.playbackRate,
                sender,
              )

            case MESSAGES.TIME_CHANGE:
              return await deviceService.timeUpdate(message.timeMs, sender)

            case MESSAGES.DURATION_CHANGE:
              return await deviceService.durationChange(
                message.duration,
                sender,
              )

            case MESSAGES.VOLUME_CHANGE:
              return await deviceService.setVolume(
                message.volume,
                message.muted,
                sender,
              )

            // Settings
            case MESSAGES.SHOW_HEATMAP:
              return await deviceService.setSettings(message.settings)
            case MESSAGES.SET_CUSTOM_URLS:
              return await deviceService.setCustomUrls(message.urls)

            // IveDB
            case MESSAGES.IVEDB_PING:
              return await iveDBService.ping()

            case MESSAGES.IVEDB_GET_ENTRIES_PAGINATED:
              return await iveDBService.getEntriesPaginated(
                message.offset,
                message.limit,
              )

            case MESSAGES.IVEDB_GET_ENTRY:
              return await iveDBService.getBasicEntry(message.entryId)

            case MESSAGES.IVEDB_GET_ENTRY_WITH_DETAILS:
              return await iveDBService.getEntryWithDetails(message.entryId)

            case MESSAGES.IVEDB_CREATE_ENTRY:
              return await iveDBService.createEntry(message.data)

            case MESSAGES.IVEDB_GET_ALL_ENTRIES:
              return await iveDBService.getAllEntries()

            case MESSAGES.IVEDB_SEARCH_ENTRIES:
              return await iveDBService.searchEntries(message.options)

            case MESSAGES.IVEDB_UPDATE_ENTRY:
              return await iveDBService.updateEntry(
                message.entryId,
                message.updates,
              )

            case MESSAGES.IVEDB_DELETE_ENTRY:
              return await iveDBService.deleteEntry(message.entryId)

            case MESSAGES.IVEDB_ADD_FAVORITE:
              return await iveDBService.addToFavorites(message.entryId)

            case MESSAGES.IVEDB_REMOVE_FAVORITE:
              return await iveDBService.removeFromFavorites(message.entryId)

            case MESSAGES.IVEDB_GET_FAVORITES:
              return await iveDBService.getFavorites()

            case MESSAGES.IVEDB_IS_FAVORITED:
              return await iveDBService.isFavorited(message.entryId)

            case MESSAGES.IVEDB_FIND_BY_VIDEO_URL:
              return await iveDBService.findEntryByVideoUrl(message.url)

            case MESSAGES.IVEDB_FIND_BY_SCRIPT_URL:
              return await iveDBService.findEntryByScriptUrl(message.url)

            case MESSAGES.IVEDB_GET_VIDEO_LOOKUPS:
              return await iveDBService.getAllVideoLookups()

            // Utils
            case MESSAGES.EXTRACT_SCRIPT_URL:
              return await deviceService.extractRealScriptUrlFromCloudflare(
                message.url,
              )

            default:
              return {
                error: `Unknown message type: ${(message as { type: string }).type}`,
              }
          }
        } catch (error) {
          console.error('Error handling message:', error)
          return {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }

      // For asynchronous operations, we need to return true from the listener
      // and then call sendResponse when the async operation completes
      handleAsyncOperation().then(sendResponse)
      return true
    },
  )

  // Listen for tab removal to clear active script tab
  chrome.tabs.onRemoved.addListener((tabId) => {
    deviceService.clearActiveScriptTab(tabId)
  })
}
