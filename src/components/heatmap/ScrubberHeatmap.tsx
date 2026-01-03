import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Heatmap } from '../heatmap/Heatmap'
import { LiveHeatmap } from '../heatmap/LiveHeatmap'
import { Scrubber } from './scrubber/Scrubber'
import styles from './ScrubberHeatmap.module.scss'

export const ScrubberHeatmap = () => {
  const videoElement = useVideoStore((state) => state.videoElement)
  const isFloating = useVideoStore((state) => state.isFloating)
  const duration = useVideoStore((state) => state.duration)
  const isAudioScriptingEnabled = useVideoStore(
    (state) => state.isAudioScriptingEnabled,
  )
  const hapticHistory = useVideoStore((state) => state.hapticHistory)

  const funscript = useDeviceStore((state) => state.funscript)

  if (!videoElement || isFloating) {
    return null
  }

  // Show live heatmap when audio scripting is active, otherwise show script heatmap
  const showLiveHeatmap = isAudioScriptingEnabled && hapticHistory.length > 1
  const showScriptHeatmap = !isAudioScriptingEnabled && funscript

  if (!showLiveHeatmap && !showScriptHeatmap) {
    return null
  }

  return (
    <div className={styles.scrubberHeatmap}>
      {showLiveHeatmap ? (
        <LiveHeatmap points={hapticHistory} videoDuration={duration} />
      ) : (
        <Heatmap />
      )}
      <Scrubber onSeek={(time) => (videoElement.currentTime = time / 1000)} />
    </div>
  )
}
