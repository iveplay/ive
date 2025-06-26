import { MESSAGES, UIMessage } from '@background/types'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface SettingsStore {
  showHeatmap: boolean
  customUrls: string[]
  setShowHeatmap: (showHeatmap: boolean) => Promise<void>
  setCustomUrls: (urls: string[]) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  showHeatmap: false,
  customUrls: [],
  setShowHeatmap: async (showHeatmap: boolean) => {
    set({ showHeatmap })
    await chrome.runtime.sendMessage({
      type: MESSAGES.SHOW_HEATMAP,
      settings: {
        showHeatmap,
      },
    })
  },
  setCustomUrls: async (urls: string[]) => {
    set({ customUrls: urls })
    await chrome.runtime.sendMessage({
      type: MESSAGES.SET_CUSTOM_URLS,
      urls,
    })
  },
}))

export function useSettingsSetup(): void {
  const hasRanRef = useRef(false)

  useEffect(() => {
    // Get initial state
    const fetchInitialState = async () => {
      if (hasRanRef.current) return
      hasRanRef.current = true

      try {
        const state = await chrome.runtime.sendMessage({
          type: MESSAGES.GET_STATE,
        })

        useSettingsStore.setState({
          showHeatmap: state.showHeatmap,
          customUrls: state.customUrls || [],
        })
      } catch (error) {
        console.error('Error fetching initial state:', error)
      }
    }

    fetchInitialState()

    const handleMessage = (message: UIMessage) => {
      if (message.type === MESSAGES.DEVICE_STATE_UPDATE) {
        // Update store with new state
        useSettingsStore.setState({
          showHeatmap: message.state.showHeatmap,
          customUrls: message.state.customUrls || [],
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
