import { useState, useRef, useEffect, useCallback } from 'react'
import { DraggableWrapper } from '@/components/draggableWrapper/DraggableWrapper'
import styles from './FloatingVideoWindow.module.scss'

interface FloatingVideoWindowProps {
  videoElement: HTMLVideoElement
  onClose: () => void
}

export const FloatingVideoWindow = ({
  videoElement,
  onClose,
}: FloatingVideoWindowProps) => {
  const [isPlaying, setIsPlaying] = useState(!videoElement.paused)
  const [currentTime, setCurrentTime] = useState(videoElement.currentTime)
  const [duration, setDuration] = useState(videoElement.duration || 0)
  const [volume, setVolume] = useState(videoElement.volume)
  const [isMuted, setIsMuted] = useState(videoElement.muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Store original parent to restore later
  const [originalParent, setOriginalParent] = useState<{
    parent: Element
    nextSibling: Node | null
  } | null>(null)

  // Move video element to floating window
  useEffect(() => {
    if (videoContainerRef.current) {
      // Store original position
      setOriginalParent({
        parent: videoElement.parentElement!,
        nextSibling: videoElement.nextSibling,
      })

      // Move video to floating window
      videoContainerRef.current.appendChild(videoElement)

      return () => {
        // Restore video to original position on cleanup
        if (originalParent) {
          if (originalParent.nextSibling) {
            originalParent.parent.insertBefore(
              videoElement,
              originalParent.nextSibling,
            )
          } else {
            originalParent.parent.appendChild(videoElement)
          }
        }
      }
    }
  }, [videoElement, originalParent])

  // Video event listeners
  useEffect(() => {
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime)
    const handleDurationChange = () => setDuration(videoElement.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => {
      setVolume(videoElement.volume)
      setIsMuted(videoElement.muted)
    }

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('volumechange', handleVolumeChange)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [videoElement])

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }

    setShowControls(true)
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  // Mouse movement handler
  const handleMouseMove = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  // Control handlers
  const togglePlay = () => {
    if (isPlaying) {
      videoElement.pause()
    } else {
      videoElement.play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    videoElement.currentTime = newTime
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    videoElement.volume = newVolume
  }

  const toggleMute = () => {
    videoElement.muted = !isMuted
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleClose = () => {
    // Restore video to original position before closing
    if (originalParent) {
      if (originalParent.nextSibling) {
        originalParent.parent.insertBefore(
          videoElement,
          originalParent.nextSibling,
        )
      } else {
        originalParent.parent.appendChild(videoElement)
      }
    }
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DraggableWrapper
      className={isFullscreen ? styles.fullscreen : styles.floatingWindow}
      headerContent='Video Player'
      onClose={handleClose}
      storageKey='floating-video-position'
    >
      <div
        ref={videoContainerRef}
        className={styles.videoContainer}
        onMouseMove={handleMouseMove}
      />

      <div
        className={`${styles.controls} ${showControls ? styles.visible : ''}`}
      >
        <div className={styles.timeline}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <input
            type='range'
            min='0'
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className={styles.seekBar}
          />
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>

        <div className={styles.controlButtons}>
          <button onClick={togglePlay} className={styles.playButton}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className={styles.volumeControl}>
            <button onClick={toggleMute} className={styles.muteButton}>
              {isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type='range'
              min='0'
              max='1'
              step='0.1'
              value={volume}
              onChange={handleVolumeChange}
              className={styles.volumeBar}
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className={styles.fullscreenButton}
          >
            {isFullscreen ? '📉' : '📈'}
          </button>
        </div>
      </div>
    </DraggableWrapper>
  )
}
