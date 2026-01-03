import { MESSAGES } from '@background/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useVideoStore } from '@/store/useVideoStore'
import { AudioProcessor, HapticGenerator } from '@/utils/audioScripting'

export interface AudioScriptingSettings {
  energyBoost: number
  strokeSpeed: number
}

export function useAudioScripting(videoElement: HTMLVideoElement | null) {
  const [settings, setSettings] = useState<AudioScriptingSettings>({
    energyBoost: 1.5,
    strokeSpeed: 200,
  })

  // Use store for shared state
  const isEnabled = useVideoStore((state) => state.isAudioScriptingEnabled)
  const setIsEnabled = useVideoStore((state) => state.setAudioScriptingEnabled)
  const setHapticHistory = useVideoStore((state) => state.setHapticHistory)
  const clearHapticHistory = useVideoStore((state) => state.clearHapticHistory)

  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const hapticGeneratorRef = useRef<HapticGenerator | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastPositionRef = useRef<number>(-1)
  const lastSendTimeRef = useRef<number>(0)
  const isRunningRef = useRef(false)
  const hapticHistoryRef = useRef<{ time: number; position: number }[]>([])

  // Initialize processors
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor()
    hapticGeneratorRef.current = new HapticGenerator()

    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [])

  // Update settings on processors
  useEffect(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.updateSettings({
        energyBoost: settings.energyBoost,
      })
    }
    if (hapticGeneratorRef.current) {
      hapticGeneratorRef.current.updateSettings({
        strokeSpeed: settings.strokeSpeed,
      })
    }
  }, [settings])

  // Main processing loop
  const processLoop = useCallback(() => {
    if (!isRunningRef.current) return

    const audioProcessor = audioProcessorRef.current
    const hapticGenerator = hapticGeneratorRef.current
    const video = videoElement

    if (video && !video.paused && audioProcessor && hapticGenerator) {
      const features = audioProcessor.getFeatures()
      if (features) {
        const position = hapticGenerator.update(features)
        const videoTimeMs = video.currentTime * 1000

        const now = performance.now()
        const positionDelta = Math.abs(position - lastPositionRef.current)
        const timeDelta = now - lastSendTimeRef.current

        if (positionDelta >= 2 && timeDelta >= 30) {
          lastPositionRef.current = position
          lastSendTimeRef.current = now

          // Record to history
          hapticHistoryRef.current.push({ time: videoTimeMs, position })

          chrome.runtime
            .sendMessage({
              type: MESSAGES.SEND_POSITION,
              position,
              duration: 50,
            })
            .catch((err) => {
              console.warn('[AudioScripting] Failed to send position:', err)
            })
        }
      }
    }

    if (isRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(processLoop)
    }
  }, [videoElement])

  // Sync haptic history to store periodically
  useEffect(() => {
    if (!isEnabled) return

    const interval = setInterval(() => {
      if (hapticHistoryRef.current.length > 0) {
        setHapticHistory([...hapticHistoryRef.current])
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isEnabled, setHapticHistory])

  // Start/stop processing
  useEffect(() => {
    if (isEnabled && videoElement) {
      const initAndStart = async () => {
        const audioProcessor = audioProcessorRef.current
        if (!audioProcessor) {
          console.error('[AudioScripting] No audio processor')
          return
        }

        if (!audioProcessor.isInitialized()) {
          try {
            console.log('[AudioScripting] Initializing audio processor...')
            await audioProcessor.init(videoElement)
            console.log('[AudioScripting] Audio processor initialized')
          } catch (error) {
            console.error(
              '[AudioScripting] Failed to init audio processor:',
              error,
            )
            setIsEnabled(false)
            return
          }
        }

        await audioProcessor.resume()
        audioProcessorRef.current?.reset()
        hapticGeneratorRef.current?.reset()
        lastPositionRef.current = -1
        lastSendTimeRef.current = 0

        // Clear history on start
        hapticHistoryRef.current = []
        clearHapticHistory()

        isRunningRef.current = true
        console.log('[AudioScripting] Starting processing loop')
        processLoop()
      }

      initAndStart()
    } else {
      console.log('[AudioScripting] Stopping processing loop')
      isRunningRef.current = false

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      audioProcessorRef.current?.suspend()

      chrome.runtime
        .sendMessage({
          type: MESSAGES.RESET_AUDIO_SCRIPTING,
        })
        .catch(() => {})
    }

    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isEnabled, videoElement, processLoop, setIsEnabled, clearHapticHistory])

  const toggle = useCallback(() => {
    setIsEnabled(!isEnabled)
  }, [isEnabled, setIsEnabled])

  const updateSettings = useCallback(
    (newSettings: Partial<AudioScriptingSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }))
    },
    [],
  )

  return {
    isEnabled,
    settings,
    toggle,
    updateSettings,
  }
}
