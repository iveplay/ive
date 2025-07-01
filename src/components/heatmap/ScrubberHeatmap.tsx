import { useVideoStore } from '@/store/useVideoStore'
import { Heatmap } from '../heatmap/Heatmap'
import { Scrubber } from './scrubber/Scrubber'
import styles from './ScrubberHeatmap.module.scss'

export const ScrubberHeatmap = () => {
  const videoElement = useVideoStore((state) => state.videoElement)
  const isFloating = useVideoStore((state) => state.isFloating)

  if (!videoElement || isFloating) {
    return null
  }

  return (
    <div className={styles.scrubberHeatmap}>
      <Heatmap />
      <Scrubber onSeek={(time) => (videoElement.currentTime = time / 1000)} />
    </div>
  )
}
