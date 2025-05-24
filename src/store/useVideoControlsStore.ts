import { DeviceServiceState, MESSAGES, UIMessage } from '@background/types'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface VideoControlsState {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  muted: boolean
}

interface VideoControlsActions {
  play: (
    timeMs?: number,
    playbackRate?: number,
    duration?: number,
    loop?: boolean,
  ) => Promise<void>
  stop: () => Promise<void>
  seek: (timeMs: number) => Promise<void>
  syncTime: (timeMs: number) => Promise<void>
  setPlaybackRate: (rate: number) => Promise<void>
  setVolume: (volume: number, muted?: boolean) => Promise<void>
}

type VideoControlsStore = VideoControlsState & VideoControlsActions

export const useVideoControlsStore = create<VideoControlsStore>()(
  (set, get) => ({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    volume: 1.0,
    muted: false,

    play: async (timeMs, playbackRate = 1.0, duration = 0, loop = false) => {
      try {
        const currentTime = timeMs ?? get().currentTime
        await chrome.runtime.sendMessage({
          type: MESSAGES.PLAY,
          timeMs: currentTime,
          playbackRate,
          duration,
          loop,
        })
        set({ isPlaying: true })
      } catch (error) {
        console.error('Play error:', error)
        throw error
      }
    },
    stop: async () => {
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.STOP,
        })
        set({ isPlaying: false })
      } catch (error) {
        console.error('Stop error:', error)
        throw error
      }
    },
    seek: async (timeMs: number) => {
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.SEEK_UPDATE,
          timeMs,
        })
        set({ currentTime: timeMs })
      } catch (error) {
        console.error('Seek error:', error)
      }
    },
    syncTime: async (timeMs: number) => {
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.SYNC_TIME,
          timeMs,
        })
        set({ currentTime: timeMs })
      } catch (error) {
        console.error('Sync time error:', error)
      }
    },
    setPlaybackRate: async (rate: number) => {
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.RATE_CHANGE,
          playbackRate: rate,
        })
        set({ playbackRate: rate })
      } catch (error) {
        console.error('Set playback rate error:', error)
      }
    },
    setVolume: async (volume: number, muted = false) => {
      try {
        await chrome.runtime.sendMessage({
          type: MESSAGES.VOLUME_CHANGE,
          volume,
          muted,
        })
        set({ volume, muted })
      } catch (error) {
        console.error('Set volume error:', error)
      }
    },
  }),
)

export function useVideoControlsSetup(): void {
  const hasRanRef = useRef(false)

  useEffect(() => {
    // Get initial state
    const fetchInitialState = async () => {
      if (hasRanRef.current) return
      hasRanRef.current = true

      try {
        const state: DeviceServiceState = await chrome.runtime.sendMessage({
          type: MESSAGES.GET_STATE,
        })

        useVideoControlsStore.setState({
          isPlaying: state.isPlaying || false,
          currentTime: state.currentTimeMs || 0,
          duration: state.duration || 0,
          playbackRate: state.playbackRate || 1.0,
          volume: state.volume || 1.0,
          muted: state.muted || false,
        })
      } catch (error) {
        console.error('Error fetching initial state:', error)
      }
    }

    fetchInitialState()

    const handleMessage = (message: UIMessage) => {
      if (message.type === MESSAGES.DEVICE_STATE_UPDATE) {
        // Update store with new state
        useVideoControlsStore.setState({
          isPlaying: message.state.isPlaying,
          currentTime: message.state.currentTimeMs,
          duration: message.state.duration,
          playbackRate: message.state.playbackRate,
          volume: message.state.volume,
          muted: message.state.muted,
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])
}
