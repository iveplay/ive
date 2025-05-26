import { Controls } from '@/components/controls/Controls'
import { FloatingVideo } from '@/components/floatingVideo/FloatingVideo'
import { useDeviceSetup } from '@/store/useDeviceStore'
import { useSettingsStore, useSettingsSetup } from '@/store/useSettingsStore'
import { useVideoStore } from '@/store/useVideoStore'
import { Scripts } from '@/types/script'
import { VideoPanel } from '../videoPanel/VideoPanel'
import styles from './VideoPage.module.scss'

type VideoPageProps = {
  scripts: Scripts
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
      {!isFloating && showHeatmap && <Controls />}
      {isFloating && videoElement && (
        <FloatingVideo videoElement={videoElement} />
      )}
    </div>
  )
}
