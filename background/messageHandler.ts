import {
  connectDevice,
  disconnectDevice,
  setConnectionKey,
  setOffset,
  setStrokeSettings,
  setupScript,
  play,
  stop,
  syncVideoTime,
} from './apiHandler'
import {
  preferences,
  savePreferences,
  broadcastPreferences,
} from './preferences'
import {
  uploadScriptUrl,
  saveCustomScriptMapping,
  getCustomScriptForUrl,
} from './scriptManager'
import { activeTabs, handleContextUpdate } from './sessionManager'
import { state } from './state'

// Broadcast state to all connected contexts
export function broadcastState() {
  const stateMessage = {
    type: 'handy_state_update',
    state: {
      config: state.config,
      isConnected: state.isConnected,
      deviceInfo: state.deviceInfo,
      isPlaying: state.isPlaying,
      error: state.error,
    },
  }

  // Send to popup using runtime messaging (which works fine for popup)
  chrome.runtime.sendMessage(stateMessage).catch((err) => {
    // This error is expected when popup is not open
    if (!err.message.includes('Could not establish connection')) {
      console.error('Error broadcasting to popup:', err)
    }
  })

  // Send to all active content script tabs
  activeTabs.forEach((tabId) => {
    chrome.tabs.sendMessage(tabId, stateMessage).catch((err) => {
      console.error(`Error sending to tab ${tabId}:`, err)
      // If we get a connection error, assume tab is no longer valid
      if (err.message.includes('Could not establish connection')) {
        activeTabs.delete(tabId)
      }
    })
  })
}

// Message handler
export function setupMessageHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.type, message, sender)

    // Register tab if it's a content script and has a tab ID
    if (sender.tab && sender.tab.id) {
      activeTabs.add(sender.tab.id)
    }

    const handleAsyncOperation = async () => {
      try {
        switch (message.type) {
          case 'handy_get_state':
            return state

          case 'handy_connect':
            return await connectDevice(broadcastState)

          case 'handy_disconnect':
            return await disconnectDevice(broadcastState)

          case 'handy_set_connection_key':
            await setConnectionKey(message.key)
            broadcastState()
            return true

          case 'handy_set_offset':
            return await setOffset(message.offset, broadcastState)

          case 'handy_set_stroke_settings':
            return await setStrokeSettings(
              message.min,
              message.max,
              broadcastState,
            )

          case 'handy_setup_script':
            return await setupScript(message.scriptUrl, broadcastState)

          case 'handy_upload_script_url':
            return await uploadScriptUrl(message.scriptUrl, broadcastState)

          case 'handy_play':
            return await play(
              message.videoTime,
              message.playbackRate,
              message.loop,
              broadcastState,
            )

          case 'handy_stop':
            return await stop(broadcastState)

          case 'handy_sync_video_time':
            return await syncVideoTime(message.videoTime)

          case 'handy_save_custom_script_mapping':
            return await saveCustomScriptMapping(
              message.videoUrl,
              message.scriptUrl,
            )

          case 'handy_get_custom_script_for_url':
            return await getCustomScriptForUrl(message.videoUrl)

          case 'handy_context_active':
            return handleContextUpdate(
              broadcastState,
              message.context,
              message.active,
              sender.tab?.id,
            )

          case 'preferences_get':
            return preferences

          case 'preferences_set_show_info_panel':
            preferences.showInfoPanel = message.value
            savePreferences()
            broadcastPreferences()
            return true

          case 'preferences_set_show_load_panel':
            preferences.showLoadPanel = message.value
            savePreferences()
            broadcastPreferences()
            return true

          default:
            return { error: 'Unknown message type' }
        }
      } catch (error) {
        console.error('Error handling message:', error)
        return { error: String(error) }
      }
    }

    // For asynchronous operations, we need to return true from the listener
    // and then call sendResponse when the async operation completes
    handleAsyncOperation().then(sendResponse)
    return true
  })

  // Setup tab removal listener
  chrome.tabs.onRemoved.addListener((tabId) => {
    activeTabs.delete(tabId)
  })
}
