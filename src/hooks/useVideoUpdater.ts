import { MESSAGES, UIMessage } from '@background/types'
import { useEffect } from 'react'

export const useVideoUpdater = (videoElement: HTMLVideoElement | null) => {
  useEffect(() => {
    if (!videoElement) return

    const messageListener = (message: UIMessage) => {
      if (!videoElement) return

      try {
        switch (message.type) {
          case MESSAGES.PLAY_UPDATE:
            videoElement.play()
            return true

          case MESSAGES.PAUSE_UPDATE:
            videoElement.pause()
            return true

          case MESSAGES.SEEK_UPDATE:
            videoElement.currentTime = message.timeMs
            return true

          case MESSAGES.VOLUME_UPDATE:
            videoElement.volume = message.volume
            videoElement.muted = message.muted
            return true
        }
      } catch (error) {
        console.error('Error handling video message:', error)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [videoElement])
}
