import { useEffect } from 'react'
import { create } from 'zustand'

export type Preferences = {
  showInfoPanel: boolean
  showLoadPanel: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  showInfoPanel: true,
  showLoadPanel: true,
}

type PreferencesState = {
  preferences: Preferences
  isLoaded: boolean
  setShowInfoPanel: (value: boolean) => Promise<void>
  setShowLoadPanel: (value: boolean) => Promise<void>
}

export const usePreferencesStore = create<PreferencesState>(() => ({
  preferences: DEFAULT_PREFERENCES,
  isLoaded: false,

  setShowInfoPanel: async (value: boolean) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'preferences_set_show_info_panel',
        value,
      })
    } catch (error) {
      console.error('Error updating info panel preference:', error)
    }
  },

  setShowLoadPanel: async (value: boolean) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'preferences_set_show_load_panel',
        value,
      })
    } catch (error) {
      console.error('Error updating load panel preference:', error)
    }
  },
}))

export const usePreferencesSetup = () => {
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const preferences = await chrome.runtime.sendMessage({
          type: 'preferences_get',
        })
        usePreferencesStore.setState({
          preferences,
          isLoaded: true,
        })
      } catch (error) {
        console.error('Error fetching preferences:', error)
        // Mark as loaded anyway to prevent loading state
        usePreferencesStore.setState({ isLoaded: true })
      }
    }

    fetchPreferences()

    // Listen for state updates from background
    const handleMessage = (message: {
      type: string
      preferences: Preferences
    }) => {
      if (message.type === 'preferences_update') {
        usePreferencesStore.setState({
          preferences: message.preferences,
          isLoaded: true,
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
