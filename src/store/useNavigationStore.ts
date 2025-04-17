import { useEffect } from 'react'
import { create } from 'zustand'

export type Screen = 'device' | 'preferences'

type NavigationState = {
  activeScreen: Screen
  isLoaded: boolean
  setActiveScreen: (screen: Screen) => Promise<void>
}

export const useNavigationStore = create<NavigationState>(() => ({
  activeScreen: 'device',
  isLoaded: false,

  setActiveScreen: async (screen: Screen) => {
    try {
      await chrome.storage.local.set({ 'ive-active-screen': screen })
      useNavigationStore.setState({ activeScreen: screen })
    } catch (error) {
      console.error('Error saving active screen:', error)
    }
  },
}))

export const useNavigationSetup = () => {
  useEffect(() => {
    const loadActiveScreen = async () => {
      try {
        const data = await chrome.storage.local.get('ive-active-screen')
        if (data['ive-active-screen']) {
          useNavigationStore.setState({
            activeScreen: data['ive-active-screen'] as Screen,
            isLoaded: true,
          })
        } else {
          useNavigationStore.setState({ isLoaded: true })
        }
      } catch (error) {
        console.error('Error loading active screen:', error)
        useNavigationStore.setState({ isLoaded: true })
      }
    }

    loadActiveScreen()
  }, [])
}
