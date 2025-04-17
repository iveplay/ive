import { HandyApi, createHandyApi } from '@/api/handyApi'
import { state, saveConfig } from './state'

// Handler for API operations
let handyApi: HandyApi | null = null
let eventSource: EventSource | null = null

// Initialize API
export function initializeApi() {
  if (!handyApi) {
    handyApi = createHandyApi(
      import.meta.env.VITE_HANDY_BASE_URL_V3,
      import.meta.env.VITE_HANDY_BASE_URL_V2,
      import.meta.env.VITE_HANDY_APPLICATION_ID,
      state.config.connectionKey,
    )
    console.log(
      'API initialized with key:',
      state.config.connectionKey || 'empty',
    )
  }
  return handyApi
}

// Set connection key
export async function setConnectionKey(key: string) {
  state.config.connectionKey = key

  if (!handyApi) {
    initializeApi()
  } else {
    handyApi.setConnectionKey(key)
  }

  saveConfig()
  return true
}

// Connect to device
export async function connectDevice(broadcastState: () => void) {
  try {
    if (!state.config.connectionKey || state.config.connectionKey.length < 5) {
      state.error = 'Connection key must be at least 5 characters'
      broadcastState()
      return false
    }

    state.error = null

    // Clean up any existing connections
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    // Initialize API if needed
    if (!handyApi) {
      handyApi = initializeApi()
    } else {
      handyApi.setConnectionKey(state.config.connectionKey)
    }

    // Synchronize time
    await handyApi.syncTime()

    // Create SSE connection for events
    eventSource = handyApi.createEventSource()

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
    }

    eventSource.addEventListener('device_status', (event) => {
      console.log('Handy: event: device_status', event)
      const data = JSON.parse(event.data)
      state.isConnected = data.data.connected
      state.deviceInfo = data.data.info
      broadcastState()
    })

    eventSource.addEventListener('device_connected', (event) => {
      console.log('Handy: event: device_connected', event.data)
      const data = JSON.parse(event.data)
      state.isConnected = true
      state.deviceInfo = data.data.info
      broadcastState()
    })

    eventSource.addEventListener('device_disconnected', (event) => {
      console.log('Handy: event: device_disconnected', event.data)
      state.isConnected = false
      broadcastState()
    })

    eventSource.addEventListener('mode_changed', (event) => {
      console.log('Handy: event: mode_changed', event.data)
      state.isPlaying = false
      broadcastState()
    })

    eventSource.addEventListener('hsp_state_changed', (event) => {
      console.log('Handy: event: hsp_state_changed', event.data)
      const data = JSON.parse(event.data)
      // Set isPlaying based on play_state
      state.isPlaying = data.data.data?.play_state === 1
      broadcastState()
    })

    // Initialize device settings
    const offset = await handyApi.getOffset()
    if (offset) {
      state.config.offset = offset
    }

    const strokeSettings = await handyApi.getStrokeSettings()

    if (strokeSettings) {
      state.config.stroke = {
        min: strokeSettings.min,
        max: strokeSettings.max,
      }
    }

    // Save updated config
    saveConfig()
    broadcastState()
    return true
  } catch (error) {
    console.error('Handy: Error connecting to device:', error)
    state.error = 'Failed to connect to device'
    broadcastState()
    return false
  }
}

// Disconnect device
export async function disconnectDevice(broadcastState: () => void) {
  try {
    if (handyApi && state.isConnected) {
      await handyApi.stop()
    }

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    state.isConnected = false
    state.deviceInfo = null
    state.isPlaying = false
    state.config.wasManuallyDisconnected = true

    // Save updated config
    saveConfig()
    broadcastState()
    return true
  } catch (error) {
    console.error('Error disconnecting:', error)
    return true // Always consider disconnect successful for better UX
  }
}

// Set offset
export async function setOffset(offset: number, broadcastState: () => void) {
  state.config.offset = offset

  if (handyApi && state.isConnected) {
    await handyApi.setOffset(offset)
  }

  saveConfig()
  broadcastState()
  return true
}

// Set stroke settings
export async function setStrokeSettings(
  min: number,
  max: number,
  broadcastState: () => void,
) {
  state.config.stroke = { min, max }

  if (handyApi && state.isConnected) {
    await handyApi.setStrokeSettings({ min, max })
  }

  saveConfig()
  broadcastState()
  return true
}

// Setup script
export async function setupScript(
  scriptUrl: string,
  broadcastState: () => void,
) {
  if (!handyApi || !state.isConnected) {
    console.warn('Not connected to a device - setupScript')
    return false
  }

  try {
    const success = await handyApi.setupScript(scriptUrl)

    if (!success) {
      state.error = 'Failed to set up script'
      broadcastState()
    }

    return success
  } catch (error) {
    console.error('Handy: Error setting up script:', error)
    state.error = 'Failed to set up script'
    broadcastState()
    return false
  }
}

// Play script
export async function play(
  videoTime: number,
  playbackRate = 1.0,
  loop = false,
  broadcastState: () => void,
) {
  if (!handyApi || !state.isConnected) {
    state.error = 'Not connected to a device'
    broadcastState()
    return false
  }

  try {
    const hspState = await handyApi.play(videoTime, playbackRate, loop)

    if (hspState) {
      state.isPlaying = hspState.play_state === 1
      // Sync immediately
      handyApi.syncVideoTime(videoTime)
      broadcastState()
      return true
    }

    return false
  } catch (error) {
    console.error('Handy: Error playing script:', error)
    state.error = 'Failed to play script'
    broadcastState()
    return false
  }
}

// Stop script
export async function stop(broadcastState: () => void) {
  if (!handyApi || !state.isConnected) {
    state.error = 'Not connected to a device'
    broadcastState()
    return false
  }

  try {
    const hspState = await handyApi.stop()

    if (hspState) {
      state.isPlaying = hspState.play_state === 1
      broadcastState()
      return true
    }

    return false
  } catch (error) {
    console.error('Handy: Error stopping script:', error)
    state.error = 'Failed to stop script'
    broadcastState()
    return false
  }
}

// Sync video time
export async function syncVideoTime(videoTime: number) {
  if (!handyApi || !state.isConnected || !state.isPlaying) {
    return false
  }

  try {
    return await handyApi.syncVideoTime(videoTime)
  } catch (error) {
    console.error('Handy: Error syncing video time:', error)
    // Don't show errors for sync operations
    return false
  }
}
