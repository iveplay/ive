import { useState, useRef, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { DraggableWrapper } from '@/components/draggableWrapper/DraggableWrapper'
import { useVideoStore } from '@/store/useVideoStore'
import { formatTime } from '@/utils/formatTime'
import styles from './FloatingVideo.module.scss'

type FloatingVideoProps = {
  videoElement: HTMLVideoElement
}

export const FloatingVideo = ({ videoElement }: FloatingVideoProps) => {
  const { isPlaying, currentTime, duration, volume, isMuted, setIsFloating } =
    useVideoStore(
      useShallow((state) => ({
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        duration: state.duration,
        volume: state.volume,
        isMuted: state.isMuted,
        setIsFloating: state.setIsFloating,
      })),
    )

  const [showControls, setShowControls] = useState(true)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>(null)

  // Store original parent to restore later
  const [originalParent, setOriginalParent] = useState<{
    parent: Element
    nextSibling: Node | null
  } | null>(null)

  // Move video element to floating window
  useEffect(() => {
    if (videoContainerRef.current && videoElement.parentElement) {
      // Store original position
      const parentInfo = {
        parent: videoElement.parentElement,
        nextSibling: videoElement.nextSibling,
      }
      setOriginalParent(parentInfo)

      // Move video to floating window
      videoContainerRef.current.appendChild(videoElement)

      return () => {
        // Restore video to original position on cleanup
        if (parentInfo.nextSibling) {
          parentInfo.parent.insertBefore(videoElement, parentInfo.nextSibling)
        } else {
          parentInfo.parent.appendChild(videoElement)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    videoElement.currentTime = newTime / 1000
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    videoElement.volume = newVolume
  }

  const toggleMute = () => {
    videoElement.muted = !isMuted
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

    setIsFloating(false)
  }

  return (
    <DraggableWrapper storageKey='floating-video-position'>
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

          <button onClick={handleClose}>X</button>
          <div className='draggable-handle'>handle</div>
        </div>
      </div>
    </DraggableWrapper>
  )
}
