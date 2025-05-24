import { create } from 'zustand'

const findVideoElement = (): HTMLVideoElement | null => {
  const videos = Array.from(document.getElementsByTagName('video'))
  if (videos.length === 0) return null

  // Filter significant videos
  const significantVideos = videos.filter(
    (v) => v.offsetWidth > 100 && v.offsetHeight > 100,
  )

  if (significantVideos.length === 0) return null

  // First try to find playing video
  const playingVideo = significantVideos.find((v) => !v.paused)
  if (playingVideo) {
    return playingVideo
  }

  // Otherwise find largest
  return significantVideos.reduce((largest, current) => {
    const largestArea = largest.offsetWidth * largest.offsetHeight
    const currentArea = current.offsetWidth * current.offsetHeight
    return currentArea > largestArea ? current : largest
  })
}

interface VideoStore {
  videoElement: HTMLVideoElement | null
  isSearching: boolean
  error: string | null
  searchForVideo: () => void
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoElement: null,
  isSearching: false,
  error: null,

  searchForVideo: () => {
    set({ isSearching: true, error: null })

    let attempts = 0
    const maxAttempts = 5

    const attemptFind = () => {
      const video = findVideoElement()

      if (video) {
        set({ videoElement: video, isSearching: false })
        return
      }

      attempts++

      if (attempts < maxAttempts) {
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
