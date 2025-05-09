import { Slider } from '@mantine/core'
import { useEffect, useState } from 'react'
import PauseIcon from '@/assets/pause.svg'
import PlayIcon from '@/assets/play.svg'
import styles from './VideoControl.module.scss'

export const VideoControl = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Poll for video info from active tab
  useEffect(() => {
    const fetchVideoInfo = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'ive:get_video_info' },
            (response) => {
              if (chrome.runtime.lastError) {
                setIsLoaded(false)
                return
              }

              if (response) {
                setIsLoaded(true)
                setIsPlaying(response.isPlaying)
                setDuration(response.duration)
                setPlaybackRate(response.playbackRate)

                if (!isDragging) {
                  setCurrentTime(response.currentTime)
                  setSliderValue(response.currentTime)
                }
              }
            },
          )
        }
      })
    }

    // Initial fetch
    fetchVideoInfo()

    // Set up polling
    const interval = setInterval(fetchVideoInfo, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isDragging])

  // Update slider when video time changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(currentTime)
    }
  }, [currentTime, isDragging])

  const handlePlayPause = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const messageType = isPlaying ? 'ive:video_pause' : 'ive:video_play'
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: messageType },
          (response) => {
            if (chrome.runtime.lastError || !response?.success) {
              setError('Failed to control video playback')
            } else {
              setIsPlaying(!isPlaying)

              // Also update device service
              chrome.runtime.sendMessage({
                type: isPlaying ? 'ive:stop' : 'ive:play',
                timeMs: currentTime * 1000,
                playbackRate: playbackRate,
                loop: false,
              })
            }
          },
        )
      }
    })
  }

  const handleSliderChange = (value: number) => {
    setSliderValue(value)
  }

  const handleSliderChangeEnd = (value: number) => {
    setIsDragging(false)
    setCurrentTime(value)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'ive:video_seek', time: value },
          () => {
            // Also update device service to sync time
            chrome.runtime.sendMessage({
              type: 'ive:sync_time',
              timeMs: value * 1000,
            })
          },
        )
      }
    })
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
        <p>No video detected on current page</p>
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
        max={duration || 100}
        min={0}
        step={1}
        onMouseDown={() => setIsDragging(true)}
        label={formatTime(sliderValue)}
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
