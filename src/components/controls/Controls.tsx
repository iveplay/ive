import { useShallow } from 'zustand/shallow'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Heatmap } from '../heatmap/Heatmap'
import styles from './Controls.module.scss'
import { Scrubber } from './scrubber/Scrubber'

export const Controls = () => {
  const funscript = useDeviceStore((state) => state.funscript)
  const { videoElement, duration, currentTime } = useVideoStore(
    useShallow((state) => ({
      videoElement: state.videoElement,
      duration: state.duration,
      currentTime: state.currentTime,
    })),
  )

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
