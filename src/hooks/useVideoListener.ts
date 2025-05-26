import { MESSAGES } from '@background/types'
import { useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import { useVideoStore } from '@/store/useVideoStore'

export const useVideoListener = (videoElement: HTMLVideoElement | null) => {
  const {
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
  } = useVideoStore(
    useShallow((state) => ({
      isPlaying: state.isPlaying,
      setIsPlaying: state.setIsPlaying,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setVolume: state.setVolume,
      setIsMuted: state.setIsMuted,
    })),
  )

  useEffect(() => {
    if (!videoElement) return

    // Handler for play event
    const handlePlay = async () => {
      setIsPlaying(true)
      setCurrentTime(videoElement.currentTime * 1000)
      setDuration(videoElement.duration * 1000)
      setVolume(videoElement.volume)
      setIsMuted(videoElement.muted)

      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.PLAY,
          timeMs: videoElement.currentTime * 1000,
          playbackRate: videoElement.playbackRate,
          duration: videoElement.duration * 1000,
          loop: false,
        })
      } catch (error) {
        console.error('Error starting playback:', error)
      }
    }

    // Handler for pause event
    const handlePause = async () => {
      setIsPlaying(false)
      setCurrentTime(videoElement.currentTime * 1000)
      setDuration(videoElement.duration * 1000)

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
        setCurrentTime(videoElement.currentTime * 1000)
        setDuration(videoElement.duration * 1000)

        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.PLAY,
            timeMs: videoElement.currentTime * 1000,
            playbackRate: videoElement.playbackRate,
            duration: videoElement.duration * 1000,
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
        setCurrentTime(videoElement.currentTime * 1000)
        setDuration(videoElement.duration * 1000)

        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.PLAY,
            playbackRate: videoElement.playbackRate,
            timeMs: videoElement.currentTime * 1000,
            duration: videoElement.duration * 1000,
            loop: false,
          })
        } catch (error) {
          console.error('Error handling rate change:', error)
        }
      }
    }

    // Handler for time update
    const handleTimeUpdate = async () => {
      if (!videoElement.paused) {
        setCurrentTime(videoElement.currentTime * 1000)
        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.TIME_CHANGE,
            timeMs: videoElement.currentTime * 1000,
          })
        } catch (error) {
          console.error('Error syncing time:', error)
        }
      }
    }

    // Handler for duration change
    const handleDurationChange = async () => {
      if (!videoElement.paused) {
        setDuration(videoElement.duration * 1000)

        try {
          await chrome.runtime.sendMessage({
            type: MESSAGES.DURATION_CHANGE,
            duration: videoElement.duration * 1000,
          })
        } catch (error) {
          console.error('Error handling duration change:', error)
        }
      }
    }

    // Handler for volume change
    const handleVolumeChange = async () => {
      if (!videoElement.paused) {
        setVolume(videoElement.volume)
        setIsMuted(videoElement.muted)

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
    videoElement.addEventListener('durationchange', handleDurationChange)
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
      videoElement.removeEventListener('durationchange', handleDurationChange)
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
  }, [
    videoElement,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
  ])

  return { isPlaying }
}
