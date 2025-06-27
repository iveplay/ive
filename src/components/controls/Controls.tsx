import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolumeOff,
  IconSettings,
  IconRectangle,
  IconMaximize,
  IconX,
  IconGripHorizontal,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useState, useCallback } from 'react'
import { useVideoStore } from '@/store/useVideoStore'
import { formatTime } from '@/utils/formatTime'
import { RangeSlider } from '../rangeSlider/RangeSlider'
import styles from './Controls.module.scss'

type ControlsProps = {
  show: boolean
  onClose: () => void
  onTheaterMode?: () => void
}

export const Controls = ({ show, onClose, onTheaterMode }: ControlsProps) => {
  const {
    videoElement,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
  } = useVideoStore()

  const [isControlling, setIsControlling] = useState(false)
  const [localVolume, setLocalVolume] = useState(volume)
  const [isDragging, setIsDragging] = useState(false)
  const [localTime, setLocalTime] = useState(currentTime)
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
  }, [videoElement])

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

  const handleSettings = useCallback(() => {
    // Open settings panel
    console.log('Settings opened')
  }, [])

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

          <div className={styles.timeDisplay}>
            <span>{formatTime(localTime)}</span>
            <span className={styles.separator}>/</span>
            <span>{formatTime(duration)}</span>
          </div>

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
          <button
            className={styles.controlButton}
            onClick={handleSettings}
            aria-label='Settings'
          >
            <IconSettings size={16} />
          </button>
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
          <button
            className={clsx(styles.controlButton, 'draggable-handle')}
            aria-label='Drag'
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
