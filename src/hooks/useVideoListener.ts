import { MESSAGES } from '@background/types'
import { useEffect } from 'react'

export const useVideoListener = (
  videoElement: HTMLVideoElement | null,
  currentScript: string | null,
  setIsPlaying: (isPlaying: boolean) => void,
) => {
  useEffect(() => {
    if (!videoElement || !currentScript) return

    // Handler for play event
    const handlePlay = async () => {
      setIsPlaying(true)
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.PLAY,
          timeMs: videoElement.currentTime * 1000,
          playbackRate: videoElement.playbackRate,
          loop: false,
        })
      } catch (error) {
        console.error('Error starting playback:', error)
      }
    }

    // Handler for pause event
    const handlePause = async () => {
      setIsPlaying(false)
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.STOP,
        })
      } catch (error) {
        console.error('Error stopping playback:', error)
      }
    }

    // Handler for seeking
    const handleSeeking = async () => {
      if (!videoElement.paused) {
        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.PLAY,
            timeMs: videoElement.currentTime * 1000,
            playbackRate: videoElement.playbackRate,
            loop: false,
          })
        } catch (error) {
          console.error('Error syncing time:', error)
        }
      }
    }

    // Handler for rate change
    const handleRateChange = async () => {
      if (!videoElement.paused) {
        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.PLAY,
            playbackRate: videoElement.playbackRate,
          })
        } catch (error) {
          console.error('Error handling rate change:', error)
        }
      }
    }

    // Handler for time update
    const handleTimeUpdate = async () => {
      if (!videoElement.paused) {
        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.TIME_UPDATE,
            timeMs: videoElement.currentTime * 1000,
          })
        } catch (error) {
          console.error('Error syncing time:', error)
        }
      }
    }

    // Handler for volume change
    const handleVolumeChange = async () => {
      if (!videoElement.paused) {
        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.VOLUME_CHANGE,
            volume: videoElement.volume,
            muted: videoElement.muted,
          })
        } catch (error) {
          console.error('Error handling volume change:', error)
        }
      }
    }

    // Add event listeners
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('seeking', handleSeeking)
    videoElement.addEventListener('ratechange', handleRateChange)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('volumechange', handleVolumeChange)

    // Check initial state - if video is already playing when script is loaded
    if (!videoElement.paused) {
      handlePlay()
    }

    // Clean up event listeners
    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('seeking', handleSeeking)
      videoElement.removeEventListener('ratechange', handleRateChange)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('volumechange', handleVolumeChange)

      // Stop playback when component unmounts
      chrome.runtime
        .sendMessage({
          type: MESSAGES.STOP,
        })
        .catch((error) => {
          console.error('Error stopping playback on unmount:', error)
        })
    }
  }, [videoElement, currentScript, setIsPlaying])
}
