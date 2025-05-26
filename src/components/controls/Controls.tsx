import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Heatmap } from '../heatmap/Heatmap'
import styles from './Controls.module.scss'
import { Scrubber } from './scrubber/Scrubber'

export const Controls = () => {
  const funscript = useDeviceStore((state) => state.funscript)
  const videoElement = useVideoStore((state) => state.videoElement)

  if (!funscript || !videoElement) {
    return null
  }

  return (
    <div className={styles.controls}>
      <Heatmap funscript={funscript} />
      <Scrubber onSeek={(time) => (videoElement.currentTime = time / 1000)} />
    </div>
  )
}
