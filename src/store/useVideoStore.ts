import { create } from 'zustand'
import { findVideoElement } from '@/utils/findVideoElement'

const MAX_ATTEMPTS = 5

interface VideoStore {
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void
  currentTime: number
  setCurrentTime: (time: number) => void
  duration: number
  setDuration: (duration: number) => void
  volume: number
  setVolume: (volume: number) => void
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isFloating: boolean
  setIsFloating: (isFloating: boolean) => void

  // Video element and search state
  videoElement: HTMLVideoElement | null
  isSearching: boolean
  error: string | null
  searchForVideo: () => void
}

export const useVideoStore = create<VideoStore>((set) => ({
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  duration: 0,
  setDuration: (duration) => set({ duration }),
  volume: 0,
  setVolume: (volume) => set({ volume }),
  isMuted: false,
  setIsMuted: (muted) => set({ isMuted: muted }),
  isFloating: false,
  setIsFloating: (isFloating) => set({ isFloating }),

  // Video element
  videoElement: null,
  isSearching: false,
  error: null,
  searchForVideo: () => {
    set({ isSearching: true, error: null })

    let attempts = 0

    const attemptFind = () => {
      const video = findVideoElement()

      if (video) {
        set({ videoElement: video, isSearching: false })
        return
      }

      attempts++

      if (attempts < MAX_ATTEMPTS) {
        const delay = 500 * Math.pow(2, attempts - 1)
        console.log(
          `Video not found, retrying in ${delay}ms (attempt ${attempts})`,
        )
        setTimeout(attemptFind, delay)
      } else {
        console.error('Failed to find video player after maximum attempts')
        set({
          error: 'No video player found on this page',
          isSearching: false,
        })
      }
    }

    attemptFind()
  },
}))

useVideoStore.getState().searchForVideo()
