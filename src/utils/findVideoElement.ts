export const findVideoElement = (): HTMLVideoElement | null => {
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
