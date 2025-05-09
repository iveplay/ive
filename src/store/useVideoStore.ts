import { create } from 'zustand'

export interface VideoState {
  videoElement: HTMLVideoElement | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoaded: boolean
  error: string | null
}

interface VideoActions {
  setVideoElement: (video: HTMLVideoElement | null) => void
  play: () => void
  pause: () => void
  seekTo: (timeInSeconds: number) => void
  updateState: () => void
}

export const useVideoStore = create<VideoState & VideoActions>((set, get) => ({
  // State
  videoElement: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  error: null,

  // Actions
  setVideoElement: (video) => {
    set({ videoElement: video, isLoaded: !!video })
    if (video) {
      // Update initial state
      set({
        isPlaying: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration || 0,
      })
    }
  },

  play: () => {
    const { videoElement } = get()
    if (!videoElement) return

    videoElement
      .play()
      .then(() => {
        set({ isPlaying: true })
      })
      .catch((error) => {
        set({
          error: `Error playing video: ${error.message}`,
          isPlaying: false,
        })
      })
  },

  pause: () => {
    const { videoElement } = get()
    if (!videoElement) return

    videoElement.pause()
    set({ isPlaying: false })
  },

  seekTo: (timeInSeconds) => {
    const { videoElement } = get()
    if (!videoElement) return

    videoElement.currentTime = timeInSeconds
    set({ currentTime: timeInSeconds })
  },

  updateState: () => {
    const { videoElement } = get()
    if (!videoElement) return

    set({
      isPlaying: !videoElement.paused,
      currentTime: videoElement.currentTime,
      duration: videoElement.duration || 0,
    })
  },
}))
