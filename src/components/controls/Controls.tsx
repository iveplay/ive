import { useEffect, useState } from 'react'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Heatmap } from '../heatmap/Heatmap'
import styles from './Controls.module.scss'
import { Scrubber } from './scrubber/Scrubber'

export const Controls = () => {
  const funscript = useDeviceStore((state) => state.funscript)
  const videoElement = useVideoStore((state) => state.videoElement)

  const [duration, setDuration] = useState((videoElement?.duration || 0) * 1000)
  const [currentTime, setCurrentTime] = useState(
    (videoElement?.currentTime || 0) * 1000,
  )

  useEffect(() => {
    if (!videoElement) return

    const updateTime = () => {
      setCurrentTime(videoElement.currentTime * 1000)
    }

    const handleDurationChange = () => {
      setDuration(videoElement.duration * 1000)
    }

    videoElement.addEventListener('timeupdate', updateTime)
    videoElement.addEventListener('durationchange', handleDurationChange)

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime)
      videoElement.removeEventListener('durationchange', handleDurationChange)
    }
  }, [videoElement])

  if (!funscript || !videoElement) {
    return null
  }

  return (
    <div className={styles.controls}>
      <Heatmap funscript={funscript} />
      <Scrubber
        duration={duration}
        currentTime={currentTime}
        onSeek={(time) => (videoElement.currentTime = time / 1000)}
      />
    </div>
  )
}
