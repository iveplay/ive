import { useCallback, useEffect, useRef, useState } from 'react'
import { MESSAGES } from '@background/types'
import { AudioProcessor, HapticGenerator } from '@/utils/audioScripting'

export interface AudioScriptingSettings {
  energyBoost: number
  strokeSpeed: number
}

export function useAudioScripting(videoElement: HTMLVideoElement | null) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [settings, setSettings] = useState<AudioScriptingSettings>({
    energyBoost: 1.5,
    strokeSpeed: 200,
  })

  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const hapticGeneratorRef = useRef<HapticGenerator | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastPositionRef = useRef<number>(-1)
  const lastSendTimeRef = useRef<number>(0)
  const isRunningRef = useRef(false)

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

  // Main processing loop - uses ref to check if should continue
  const processLoop = useCallback(() => {
    // Check ref instead of state to avoid stale closure
    if (!isRunningRef.current) return

    const audioProcessor = audioProcessorRef.current
    const hapticGenerator = hapticGeneratorRef.current
    const video = videoElement

    // Only process when video is playing
    if (video && !video.paused && audioProcessor && hapticGenerator) {
      const features = audioProcessor.getFeatures()
      if (features) {
        const position = hapticGenerator.update(features)

        // Only send if position changed enough and enough time has passed
        const now = performance.now()
        const positionDelta = Math.abs(position - lastPositionRef.current)
        const timeDelta = now - lastSendTimeRef.current

        if (positionDelta >= 2 && timeDelta >= 30) {
          lastPositionRef.current = position
          lastSendTimeRef.current = now

          // Send position to device
          chrome.runtime.sendMessage({
            type: MESSAGES.SEND_POSITION,
            position,
            duration: 50,
          }).catch((err) => {
            console.warn('[AudioScripting] Failed to send position:', err)
          })
        }
      }
    }

    // Continue loop only if still running
    if (isRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(processLoop)
    }
  }, [videoElement])

  // Start/stop processing based on enabled state
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
            console.error('[AudioScripting] Failed to init audio processor:', error)
            setIsEnabled(false)
            return
          }
        }

        await audioProcessor.resume()
        audioProcessorRef.current?.reset()
        hapticGeneratorRef.current?.reset()
        lastPositionRef.current = -1
        lastSendTimeRef.current = 0
        
        // Set running flag BEFORE starting loop
        isRunningRef.current = true
        console.log('[AudioScripting] Starting processing loop')
        processLoop()
      }

      initAndStart()
    } else {
      // Stop processing
      console.log('[AudioScripting] Stopping processing loop')
      isRunningRef.current = false
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      audioProcessorRef.current?.suspend()
      
      // Reset HSP on the device
      chrome.runtime.sendMessage({
        type: MESSAGES.RESET_AUDIO_SCRIPTING,
      }).catch(() => {})
    }

    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isEnabled, videoElement, processLoop])

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

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
