import { Funscript, MESSAGES, UIMessage } from '@background/types'
import { DeviceInfo } from 'ive-connect'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface DeviceState {
  handyConnected: boolean
  buttplugConnected: boolean
  handyConnectionKey: string
  buttplugServerUrl: string
  handyDeviceInfo: DeviceInfo | null
  buttplugDeviceInfo: DeviceInfo | null

  // Script state
  scriptUrl: string
  scriptLoaded: boolean
  isPlaying: boolean
  funscript: Funscript | null

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

type DeviceStore = DeviceState & DeviceActions

export const useDeviceStore = create<DeviceStore>()((set) => ({
  handyConnected: false,
  buttplugConnected: false,
  handyConnectionKey: '',
  buttplugServerUrl: 'ws://localhost:12345',
  handyDeviceInfo: null,
  buttplugDeviceInfo: null,
  scriptLoaded: false,
  scriptUrl: '',
  funscript: null,
  isPlaying: false,
  handyOffset: 0,
  handyStrokeMin: 0,
  handyStrokeMax: 1,
  error: null,
  isLoaded: false,

  connectHandy: async (connectionKey: string) => {
    try {
      set({ error: null })
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.HANDY_CONNECT,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.HANDY_DISCONNECT,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.HANDY_SET_OFFSET,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.HANDY_SET_STROKE_SETTINGS,
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

  connectButtplug: async (serverUrl: string) => {
    try {
      set({ error: null })
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.BUTTPLUG_CONNECT,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.BUTTPLUG_DISCONNECT,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.BUTTPLUG_SCAN,
      })
      return success
    } catch (error) {
      set({
        error: `Scan error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  loadScriptFromUrl: async (url: string) => {
    try {
      set({ error: null })
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.LOAD_SCRIPT_URL,
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

      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.LOAD_SCRIPT_CONTENT,
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

  play: async (timeMs: number, playbackRate = 1.0, loop = false) => {
    try {
      set({ error: null })
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.PLAY,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.STOP,
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
      const success = await chrome.runtime.sendMessage({
        type: MESSAGES.SYNC_TIME,
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

// Hook to handle state updates from background
export function useDeviceSetup(): void {
  const hasRanRef = useRef(false)

  useEffect(() => {
    // Get initial state
    const fetchInitialState = async () => {
      if (hasRanRef.current) return
      hasRanRef.current = true

      try {
        chrome.runtime.sendMessage({ type: MESSAGES.AUTO_CONNECT })

        const state = await chrome.runtime.sendMessage({
          type: MESSAGES.GET_STATE,
        })

        useDeviceStore.setState({
          ...state,
          isLoaded: true,
          handyOffset: state.handySettings?.offset || 0,
          handyStrokeMin: state.handySettings?.stroke?.min || 0,
          handyStrokeMax: state.handySettings?.stroke?.max || 1,
        })

        // Also fetch device info
        const deviceInfo = await chrome.runtime.sendMessage({
          type: MESSAGES.GET_DEVICE_INFO,
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

    const handleMessage = (message: UIMessage) => {
      if (message.type === MESSAGES.DEVICE_STATE_UPDATE) {
        // Update store with new state
        useDeviceStore.setState({
          handyConnected: message.state.handyConnected,
          buttplugConnected: message.state.buttplugConnected,
          handyConnectionKey: message.state.handyConnectionKey,
          buttplugServerUrl: message.state.buttplugServerUrl,
          scriptUrl: message.state.scriptUrl,
          scriptLoaded: message.state.scriptLoaded,
          funscript: message.state.funscript || null,
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

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
