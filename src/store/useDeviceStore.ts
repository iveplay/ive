import { DeviceInfo } from 'ive-connect'
import { useEffect } from 'react'
import { create } from 'zustand'

// Device store state
export interface DeviceState {
  // Connection state
  handyConnected: boolean
  buttplugConnected: boolean

  // Settings
  handyConnectionKey: string
  buttplugServerUrl: string

  // Device info
  handyDeviceInfo: DeviceInfo | null
  buttplugDeviceInfo: DeviceInfo | null

  // Script state
  scriptLoaded: boolean
  scriptUrl: string
  isPlaying: boolean

  // Settings
  handyOffset: number
  handyStrokeMin: number
  handyStrokeMax: number

  // UI state
  error: string | null
  isLoaded: boolean
}

// Store actions
interface DeviceActions {
  // Handy actions
  connectHandy: (connectionKey: string) => Promise<boolean>
  disconnectHandy: () => Promise<boolean>
  setHandyOffset: (offset: number) => Promise<boolean>
  setHandyStrokeSettings: (min: number, max: number) => Promise<boolean>

  // Buttplug actions
  connectButtplug: (serverUrl: string) => Promise<boolean>
  disconnectButtplug: () => Promise<boolean>
  scanForButtplugDevices: () => Promise<boolean>

  // Script actions
  loadScriptFromUrl: (url: string) => Promise<boolean>
  loadScriptFile: (file: File) => Promise<boolean>

  // Playback actions
  play: (
    timeMs: number,
    playbackRate?: number,
    loop?: boolean,
  ) => Promise<boolean>
  stop: () => Promise<boolean>
  syncTime: (timeMs: number) => Promise<boolean>

  // Handle local state updates
  setHandyConnectionKey: (key: string) => void
  setButtplugServerUrl: (url: string) => void
  setError: (error: string | null) => void
}

// Combined store type
type DeviceStore = DeviceState & DeviceActions

/**
 * Helper function to send messages to background
 */
async function sendMessageToBackground<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        if (response && typeof response === 'object' && 'error' in response) {
          reject(new Error(response.error as string))
        } else {
          resolve(response as T)
        }
      }
    })
  })
}

/**
 * Main device store
 */
export const useDeviceStore = create<DeviceStore>()((set) => ({
  // Initial state
  handyConnected: false,
  buttplugConnected: false,
  handyConnectionKey: '',
  buttplugServerUrl: 'ws://localhost:12345',
  handyDeviceInfo: null,
  buttplugDeviceInfo: null,
  scriptLoaded: false,
  scriptUrl: '',
  isPlaying: false,
  handyOffset: 0,
  handyStrokeMin: 0,
  handyStrokeMax: 1,
  error: null,
  isLoaded: false,

  // Handy actions
  connectHandy: async (connectionKey: string) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:handy_connect',
        connectionKey,
      })
      return success
    } catch (error) {
      set({
        error: `Connect error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  disconnectHandy: async () => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:handy_disconnect',
      })
      return success
    } catch (error) {
      set({
        error: `Disconnect error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  setHandyOffset: async (offset: number) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:handy_set_offset',
        offset,
      })
      if (success) {
        set({ handyOffset: offset })
      }
      return success
    } catch (error) {
      set({
        error: `Set offset error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  setHandyStrokeSettings: async (min: number, max: number) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:handy_set_stroke_settings',
        min,
        max,
      })
      if (success) {
        set({ handyStrokeMin: min, handyStrokeMax: max })
      }
      return success
    } catch (error) {
      set({
        error: `Set stroke error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  // Buttplug actions
  connectButtplug: async (serverUrl: string) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:buttplug_connect',
        serverUrl,
      })
      return success
    } catch (error) {
      set({
        error: `Connect error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  disconnectButtplug: async () => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:buttplug_disconnect',
      })
      return success
    } catch (error) {
      set({
        error: `Disconnect error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  scanForButtplugDevices: async () => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:buttplug_scan',
      })
      return success
    } catch (error) {
      set({
        error: `Scan error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  // Script actions
  loadScriptFromUrl: async (url: string) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:load_script_url',
        url,
      })
      if (success) {
        set({ scriptUrl: url })
      }
      return success
    } catch (error) {
      set({
        error: `Load script error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  loadScriptFile: async (file: File) => {
    try {
      set({ error: null })

      // Read the file
      const content = await new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const result = reader.result as string
              resolve(JSON.parse(result))
            } catch {
              reject(new Error('Invalid funscript format'))
            }
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(file)
        },
      )

      const success = await sendMessageToBackground<boolean>({
        type: 'ive:load_script_content',
        content,
      })

      return success
    } catch (error) {
      set({
        error: `Load script error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  // Playback actions
  play: async (timeMs: number, playbackRate = 1.0, loop = false) => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:play',
        timeMs,
        playbackRate,
        loop,
      })
      return success
    } catch (error) {
      set({
        error: `Play error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  stop: async () => {
    try {
      set({ error: null })
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:stop',
      })
      return success
    } catch (error) {
      set({
        error: `Stop error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  syncTime: async (timeMs: number) => {
    try {
      const success = await sendMessageToBackground<boolean>({
        type: 'ive:sync_time',
        timeMs,
      })
      return success
    } catch (error) {
      console.error('Sync time error:', error)
      // Don't set error for sync failures
      return false
    }
  },

  // Local state updates
  setHandyConnectionKey: (key: string) => {
    set({ handyConnectionKey: key })
  },

  setButtplugServerUrl: (url: string) => {
    set({ buttplugServerUrl: url })
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))

interface DeviceStateUpdate {
  handyConnected: boolean
  buttplugConnected: boolean
  scriptLoaded: boolean
  isPlaying: boolean
  handySettings?: {
    offset: number
    stroke: { min: number; max: number }
  }
  error?: string | null
  deviceInfo?: {
    handy: DeviceInfo | null
    buttplug: DeviceInfo | null
  }
}

// Hook to handle state updates from background
export function useDeviceSetup(): void {
  useEffect(() => {
    // Get initial state
    const fetchInitialState = async () => {
      try {
        const state = await sendMessageToBackground<DeviceStateUpdate>({
          type: 'ive:get_state',
        })

        useDeviceStore.setState({
          ...state,
          isLoaded: true,
          handyOffset: state.handySettings?.offset || 0,
          handyStrokeMin: state.handySettings?.stroke?.min || 0,
          handyStrokeMax: state.handySettings?.stroke?.max || 1,
        })

        // Also fetch device info
        const deviceInfo = await sendMessageToBackground<{
          handy: DeviceInfo | null
          buttplug: DeviceInfo | null
        }>({
          type: 'ive:get_device_info',
        })

        useDeviceStore.setState({
          handyDeviceInfo: deviceInfo?.handy || null,
          buttplugDeviceInfo: deviceInfo?.buttplug || null,
        })
      } catch (error) {
        console.error('Error fetching initial state:', error)
        useDeviceStore.setState({ isLoaded: true })
      }
    }

    fetchInitialState()

    // Listen for state updates from background
    const handleMessage = (message: {
      type: string
      state: DeviceStateUpdate
    }) => {
      if (message.type === 'state_update') {
        // Update store with new state
        useDeviceStore.setState({
          handyConnected: message.state.handyConnected,
          buttplugConnected: message.state.buttplugConnected,
          scriptLoaded: message.state.scriptLoaded,
          isPlaying: message.state.isPlaying,
          handyOffset: message.state.handySettings?.offset || 0,
          handyStrokeMin: message.state.handySettings?.stroke?.min || 0,
          handyStrokeMax: message.state.handySettings?.stroke?.max || 1,
          error: message.state.error || null,
        })

        // Also update device info if available
        if (message.state.deviceInfo) {
          useDeviceStore.setState({
            handyDeviceInfo: message.state.deviceInfo.handy || null,
            buttplugDeviceInfo: message.state.deviceInfo.buttplug || null,
          })
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
