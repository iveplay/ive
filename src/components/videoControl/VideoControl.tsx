import { Slider } from '@mantine/core'
import { useEffect, useState } from 'react'
import PauseIcon from '@/assets/pause.svg'
import PlayIcon from '@/assets/play.svg'
import { useVideoStore } from '@/store/useVideoStore'
import styles from './VideoControl.module.scss'

export const VideoControl = () => {
  const {
    videoElement,
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    error,
    play,
    pause,
    seekTo,
    updateState,
  } = useVideoStore()

  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Update slider when video time changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(currentTime)
    }
  }, [currentTime, isDragging])

  // Set up periodic updates of video state
  useEffect(() => {
    if (!videoElement) return

    // Create update interval
    const interval = setInterval(() => {
      updateState()
    }, 1000)

    // Set up event listeners for more immediate updates
    const handlePlay = () => updateState()
    const handlePause = () => updateState()
    const handleTimeUpdate = () => {
      if (!isDragging) updateState()
    }
    const handleDurationChange = () => updateState()

    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)

    return () => {
      clearInterval(interval)
      if (videoElement) {
        videoElement.removeEventListener('play', handlePlay)
        videoElement.removeEventListener('pause', handlePause)
        videoElement.removeEventListener('timeupdate', handleTimeUpdate)
        videoElement.removeEventListener('durationchange', handleDurationChange)
      }
    }
  }, [videoElement, updateState, isDragging])

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const handleSliderChange = (value: number) => {
    setSliderValue(value)
  }

  const handleSliderChangeEnd = (value: number) => {
    setIsDragging(false)
    seekTo(value)
  }

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isLoaded) {
    return (
      <div className={styles.noVideo}>
        <p>No script connected to any video</p>
        <p>If you are on a video page try resyncing or reloading</p>
      </div>
    )
  }

  return (
    <div className={styles.videoControl}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.timeDisplay}>
        <span>{formatTime(sliderValue)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <Slider
        value={sliderValue}
        onChange={handleSliderChange}
        onChangeEnd={handleSliderChangeEnd}
        max={duration}
        min={0}
        step={1}
        onMouseDown={() => setIsDragging(true)}
        className={styles.slider}
        color='#7b024d'
      />

      <div className={styles.controls}>
        <button
          className={styles.playPauseButton}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  )
}
