import { MESSAGES } from '@background/types'
import { useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { chromeStorageAdapter } from '@/utils/chromeStorageAdapter'

export interface SettingsStore {
  showHeatmap: boolean
  setShowHeatmap: (showHeatmap: boolean) => Promise<void>
  broadcastSettings: () => void
}

const getPersistedState = (state: SettingsStore) => {
  return {
    showHeatmap: state.showHeatmap,
  }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      showHeatmap: true,
      setShowHeatmap: async (showHeatmap: boolean) => {
        set({ showHeatmap })
        get().broadcastSettings()
      },
      broadcastSettings: () => {
        const state = get()

        chrome.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: MESSAGES.SETTINGS_UPDATE,
                settings: getPersistedState(state),
              })
            }
          })
        })
      },
    }),
    {
      name: 'ive-settings',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => getPersistedState(state),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.broadcastSettings()
        }
      },
    },
  ),
)

export const useSettingsSetup = () => {
  useEffect(() => {
    const settingsListener = (message: {
      type: string
      settings: SettingsStore
    }) => {
      if (message.type === MESSAGES.SETTINGS_UPDATE) {
        const { settings } = message
        useSettingsStore.setState(settings)
      }
    }

    chrome.runtime.onMessage.addListener(settingsListener)
    return () => {
      chrome.runtime.onMessage.removeListener(settingsListener)
    }
  }, [])
}
