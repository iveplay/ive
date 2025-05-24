import { MESSAGES, UIMessage } from '@background/types'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface SettingsStore {
  showHeatmap: boolean
  setShowHeatmap: (showHeatmap: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  showHeatmap: false,
  setShowHeatmap: async (showHeatmap: boolean) => {
    set({ showHeatmap })
    await chrome.runtime.sendMessage({
      type: MESSAGES.SHOW_HEATMAP,
      settings: {
        showHeatmap,
      },
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
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
