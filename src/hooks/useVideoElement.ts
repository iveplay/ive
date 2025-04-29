import { useEffect, useState } from 'react'

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

export const useVideoElement = () => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  )
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to search for video with retry
  const searchForVideo = () => {
    setIsSearching(true)
    setError(null)

    let attempts = 0
    const maxAttempts = 5

    const attemptFind = () => {
      const video = findVideoElement()

      if (video) {
        setVideoElement(video)
        setIsSearching(false)
        return
      }

      attempts++

      if (attempts < maxAttempts) {
        // Exponential backoff
        const delay = 500 * Math.pow(2, attempts - 1)
        console.log(
          `Video not found, retrying in ${delay}ms (attempt ${attempts})`,
        )
        setTimeout(attemptFind, delay)
      } else {
        console.error('Failed to find video player after maximum attempts')
        setError('No video player found on this page')
        setIsSearching(false)
      }
    }

    attemptFind()
  }

  useEffect(() => {
    searchForVideo()
  }, [])

  return {
    videoElement,
    isSearching,
    error,
    retry: searchForVideo,
  }
}
