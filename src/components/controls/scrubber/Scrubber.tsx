import { useState, useRef, useCallback } from 'react'
import styles from './Scrubber.module.scss'

const SEEK_THROTTLE = 100

// Format time in MM:SS
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

type ScrubberProps = {
  duration: number
  currentTime: number
  onSeek?: (time: number) => void
}

export const Scrubber = ({ duration, currentTime, onSeek }: ScrubberProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [localTime, setLocalTime] = useState(currentTime)
  const lastSeekTime = useRef(0)

  // Update local time when currentTime changes (but not while dragging)
  if (!isDragging && localTime !== currentTime) {
    setLocalTime(currentTime)
  }

  const throttledSeek = useCallback(
    (time: number) => {
      const now = Date.now()
      if (now - lastSeekTime.current >= SEEK_THROTTLE) {
        onSeek?.(time)
        lastSeekTime.current = now
      }
    },
    [onSeek],
  )

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      // Final seek call on release
      onSeek?.(localTime)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10)
    setLocalTime(newTime)

    if (isDragging) {
      throttledSeek(newTime)
    } else {
      onSeek?.(newTime)
    }
  }

  return (
    <div className={styles.scrubberContainer}>
      <div className={styles.timeDisplay}>
        <span className={styles.currentTime}>{formatTime(localTime)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.totalTime}>{formatTime(duration)}</span>
      </div>
      <input
        type='range'
        min='0'
        max={duration}
        value={localTime}
        className={styles.scrubber}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      />
    </div>
  )
}
