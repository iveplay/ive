import { FloatingVideo } from '@/components/floatingVideo/FloatingVideo'
import { ScrubberHeatmap } from '@/components/heatmap/ScrubberHeatmap'
import { useDeviceSetup } from '@/store/useDeviceStore'
import { useSettingsStore, useSettingsSetup } from '@/store/useSettingsStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Scripts } from '@/types/script'
import { VideoPanel } from '../videoPanel/VideoPanel'
import styles from './VideoPage.module.scss'

type VideoPageProps = {
  scripts?: Scripts
}

export const VideoPage = ({ scripts }: VideoPageProps) => {
  useSettingsSetup()
  useDeviceSetup()

  const showHeatmap = useSettingsStore((state) => state.showHeatmap)
  const videoElement = useVideoStore((state) => state.videoElement)
  const isFloating = useVideoStore((state) => state.isFloating)

  return (
    <div className={styles.videoPage}>
      <VideoPanel scripts={scripts} />
      {scripts && showHeatmap && <ScrubberHeatmap />}
      {isFloating && videoElement && (
        <FloatingVideo videoElement={videoElement} hasScript={!!scripts} />
      )}
    </div>
  )
}
