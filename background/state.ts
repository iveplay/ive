import type { HandyState } from '@/store/useHandyStore'

// Initialize state
export const state: HandyState = {
  config: {
    connectionKey: '',
    offset: 0,
    stroke: {
      min: 0,
      max: 1,
    },
    wasManuallyDisconnected: false,
  },
  isConnected: false,
  deviceInfo: null,
  isPlaying: false,
  error: null,
}

// Load stored config
export async function loadConfig() {
  try {
    const storedData = await chrome.storage.sync.get('handy-storage')
    if (storedData['handy-storage']) {
      const parsedData = JSON.parse(storedData['handy-storage'])
      if (parsedData.state?.config) {
        state.config = {
          ...state.config,
          ...parsedData.state.config,
        }
        console.log('Loaded stored config:', state.config)
      }
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }
}

// Save config
export async function saveConfig() {
  try {
    const dataToStore = {
      state: {
        config: {
          connectionKey: state.config.connectionKey,
          offset: state.config.offset,
          stroke: {
            min: state.config.stroke.min,
            max: state.config.stroke.max,
          },
          wasManuallyDisconnected: state.config.wasManuallyDisconnected,
        },
      },
    }
    await chrome.storage.sync.set({
      'handy-storage': JSON.stringify(dataToStore),
    })
  } catch (error) {
    console.error('Error saving config:', error)
  }
}
