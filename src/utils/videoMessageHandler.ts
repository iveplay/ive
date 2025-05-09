export type VideoMessage =
  | { type: 'ive:video_play'; time?: number }
  | { type: 'ive:video_pause' }
  | { type: 'ive:video_seek'; time: number }
  | { type: 'ive:get_video_info' }

export function setupVideoMessageHandler(
  videoElement: HTMLVideoElement | null,
): () => void {
  if (!videoElement) return () => {}

  const messageListener = (
    message: VideoMessage,
    _: chrome.runtime.MessageSender,
    sendResponse: (response?: {
      success: boolean
      error?: string
      isPlaying?: boolean
      currentTime?: number
      duration?: number
      playbackRate?: number
      volume?: number
      muted?: boolean
    }) => void,
  ) => {
    if (!videoElement) return

    try {
      switch (message.type) {
        case 'ive:video_play':
          videoElement
            .play()
            .then(() => sendResponse({ success: true }))
            .catch((error) => {
              console.error('Error playing video:', error)
              sendResponse({ success: false, error: error.message })
            })
          return true // Indicate async response

        case 'ive:video_pause':
          videoElement.pause()
          sendResponse({ success: true })
          break

        case 'ive:video_seek':
          videoElement.currentTime = message.time
          sendResponse({ success: true })
          break

        case 'ive:get_video_info':
          sendResponse({
            success: true,
            isPlaying: !videoElement.paused,
            currentTime: videoElement.currentTime,
            duration: videoElement.duration || 0,
            playbackRate: videoElement.playbackRate,
            volume: videoElement.volume,
            muted: videoElement.muted,
          })
          break
      }
    } catch (error) {
      console.error('Error handling video message:', error)
      sendResponse({ success: false, error: String(error) })
    }
  }

  chrome.runtime.onMessage.addListener(messageListener)

  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener)
  }
}
