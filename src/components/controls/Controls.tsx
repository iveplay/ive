import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolumeOff,
  IconRectangle,
  IconMaximize,
  IconX,
  IconGripHorizontal,
  IconRewindBackward10,
  IconRewindForward30,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useVideoStore } from '@/store/useVideoStore'
import { formatTime } from '@/utils/formatTime'
import { Heatmap } from '../heatmap/Heatmap'
import { LiveHeatmap } from '../heatmap/LiveHeatmap'
import { RangeSlider } from '../rangeSlider/RangeSlider'
import styles from './Controls.module.scss'
import { ControlSettings } from './ControlSettings'

type ControlsProps = {
  show: boolean
  onClose: () => void
  onTheaterMode?: () => void
  isVertical: boolean
  onOrientationChange: (isVertical: boolean) => void
  shouldShowHeatmap?: boolean
  containerWidth?: number
}

export const Controls = ({
  show,
  onClose,
  onTheaterMode,
  isVertical,
  onOrientationChange,
  shouldShowHeatmap = false,
  containerWidth,
}: ControlsProps) => {
  const {
    videoElement,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
  } = useVideoStore(
    useShallow((state) => ({
      videoElement: state.videoElement,
      isPlaying: state.isPlaying,
      setIsPlaying: state.setIsPlaying,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
    })),
  )
  const showHeatmap = useSettingsStore((state) => state.showHeatmap)
  const isAudioScriptingEnabled = useVideoStore(
    (state) => state.isAudioScriptingEnabled,
  )
  const hapticHistory = useVideoStore((state) => state.hapticHistory)
  const funscript = useDeviceStore((state) => state.funscript)

  // Determine which heatmap to show
  const showLiveHeatmap = isAudioScriptingEnabled && hapticHistory.length > 1
  const showScriptHeatmap =
    !isAudioScriptingEnabled && funscript && shouldShowHeatmap

  const [isControlling, setIsControlling] = useState(false)
  const [localVolume, setLocalVolume] = useState(volume)
  const [isDragging, setIsDragging] = useState(false)
  const [localTime, setLocalTime] = useState(currentTime)

  // Check if this is live content (no duration or infinite duration)
  const isLiveContent = !duration || !isFinite(duration) || duration === 0

  // Determine if we should use compact layout
  const isCompact = containerWidth ? containerWidth < 550 : false

  // Update local time when not dragging
  if (!isDragging && localTime !== currentTime) {
    setLocalTime(currentTime)
  }

  const handlePlayPause = useCallback(() => {
    if (!videoElement) return

    if (videoElement.paused) {
      videoElement.play()
      setIsPlaying(true)
    } else {
      videoElement.pause()
      setIsPlaying(false)
    }
  }, [videoElement, setIsPlaying])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoElement) return

      const newVolume = parseFloat(e.target.value)
      setLocalVolume(newVolume)
      videoElement.volume = newVolume
      videoElement.muted = newVolume === 0
    },
    [videoElement],
  )

  const handleMuteToggle = useCallback(() => {
    if (!videoElement) return
    videoElement.muted = !videoElement.muted
    if (!videoElement.muted) {
      const newVolume = localVolume || 0.5
      videoElement.volume = newVolume
      setLocalVolume(newVolume)
    }
  }, [localVolume, videoElement])

  const handleTimeSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseInt(e.target.value, 10)
      setLocalTime(newTime)

      if (videoElement) {
        videoElement.currentTime = newTime / 1000
      }
    },
    [videoElement],
  )

  const handleSeekStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleSeekEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFullscreen = useCallback(() => {
    if (!videoElement) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoElement.requestFullscreen()
    }
  }, [videoElement])

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!videoElement || isLiveContent) return
      videoElement.currentTime = Math.max(
        0,
        Math.min(videoElement.duration, videoElement.currentTime + seconds),
      )
    },
    [videoElement, isLiveContent],
  )

  const handlePictureInPicture = useCallback(async () => {
    if (!videoElement) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoElement.requestPictureInPicture()
      }
    } catch (error) {
      console.error('Picture-in-Picture not supported:', error)
    }
  }, [videoElement])

  const handleSpeedChange = useCallback(
    (speed: number) => {
      if (!videoElement) return
      videoElement.playbackRate = speed
    },
    [videoElement],
  )

  useEffect(() => {
    if (!isMuted) {
      setLocalVolume(videoElement?.volume || volume)
    }
  }, [volume, isMuted, videoElement?.volume])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          if (!isLiveContent) {
            e.preventDefault()
            handleSkip(-10)
          }
          break
        case 'ArrowRight':
          if (!isLiveContent) {
            e.preventDefault()
            handleSkip(30)
          }
          break
        case 'KeyM':
          e.preventDefault()
          handleMuteToggle()
          break
        case 'KeyF':
          e.preventDefault()
          handleFullscreen()
          break
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isLiveContent,
    handlePlayPause,
    handleSkip,
    handleMuteToggle,
    handleFullscreen,
  ])

  return (
    <div
      className={styles.controls}
      style={{
        transform: isControlling || show ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
      }}
      onMouseEnter={() => setIsControlling(true)}
      onMouseLeave={() => setIsControlling(false)}
    >
      {/* Only show scrubber for non-live content */}
      {!isLiveContent && (
        <>
          {showHeatmap &&
            !isCompact &&
            (showLiveHeatmap || showScriptHeatmap) && (
              <div className={styles.heatmapContainer}>
                {showLiveHeatmap ? (
                  <LiveHeatmap
                    points={hapticHistory}
                    videoDuration={duration}
                  />
                ) : (
                  <Heatmap />
                )}
              </div>
            )}
          <div className={styles.scrubberContainer}>
            <RangeSlider
              min='0'
              max={duration}
              value={localTime}
              onChange={handleTimeSeek}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              aria-label='Seek'
            />
          </div>
        </>
      )}

      <div className={styles.controlsBar}>
        <div className={styles.leftSection}>
          <button
            className={styles.controlButton}
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <IconPlayerPause size={16} />
            ) : (
              <IconPlayerPlay size={16} />
            )}
          </button>

          {!isLiveContent && !isCompact && (
            <>
              <button
                className={styles.controlButton}
                onClick={() => handleSkip(-10)}
                aria-label='Skip back 10 seconds'
              >
                <IconRewindBackward10 size={16} />
              </button>

              <button
                className={styles.controlButton}
                onClick={() => handleSkip(30)}
                aria-label='Skip forward 30 seconds'
              >
                <IconRewindForward30 size={16} />
              </button>
            </>
          )}

          {!isLiveContent && (
            <div className={styles.timeDisplay}>
              <span>{formatTime(localTime)}</span>
              <span className={styles.separator}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          )}
          {isLiveContent && (
            <div className={styles.timeDisplay}>
              <span style={{ color: '#ff4444', fontWeight: 'bold' }}>LIVE</span>
            </div>
          )}
          <div className={styles.volumeContainer}>
            <button
              className={styles.controlButton}
              onClick={handleMuteToggle}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || localVolume === 0 ? (
                <IconVolumeOff size={16} />
              ) : (
                <IconVolume size={16} />
              )}
            </button>

            <RangeSlider
              min='0'
              max='1'
              step='0.01'
              value={localVolume}
              onChange={handleVolumeChange}
              aria-label='Volume'
            />
          </div>
        </div>
        <div />
        {/* Right section - Settings, Theater, Fullscreen, Close */}
        <div className={styles.rightSection}>
          <ControlSettings
            handleSpeedChange={handleSpeedChange}
            handlePictureInPicture={handlePictureInPicture}
            onOrientationChange={onOrientationChange}
            isVertical={isVertical}
            isLiveContent={isLiveContent}
            onTheaterMode={onTheaterMode}
            onFullscreen={handleFullscreen}
            isCompact={isCompact}
          />

          {!isCompact && (
            <>
              <button
                className={styles.controlButton}
                onClick={onTheaterMode}
                aria-label='Theater Mode'
              >
                <IconRectangle size={16} />
              </button>
              <button
                className={styles.controlButton}
                onClick={handleFullscreen}
                aria-label='Fullscreen'
              >
                <IconMaximize size={16} />
              </button>
            </>
          )}

          <button
            className={clsx(styles.controlButton, 'draggable-handle')}
            aria-label='Drag'
            style={{ cursor: 'move' }}
          >
            <IconGripHorizontal size={16} />
          </button>
          <button
            className={styles.controlButton}
            onClick={onClose}
            aria-label='Close'
          >
            <IconX size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
