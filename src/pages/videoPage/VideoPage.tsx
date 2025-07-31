import { FloatingVideo } from '@/components/floatingVideo/FloatingVideo'
import { ScrubberHeatmap } from '@/components/heatmap/ScrubberHeatmap'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
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
  const activeScript = useVideoStore((state) => state.activeScript)
  const scriptUrl = useDeviceStore((state) => state.scriptUrl)

  const isIvdbScript = scriptUrl?.startsWith('ivdb://')
  const shouldShowHeatmap =
    showHeatmap && scripts && scriptUrl === activeScript && !isIvdbScript
  const isInIframe = window !== window.top

  return (
    <div className={styles.videoPage}>
      <VideoPanel
        scripts={scripts}
        isIvdbScript={isIvdbScript}
        disableFloat={isInIframe}
      />
      {shouldShowHeatmap && <ScrubberHeatmap />}
      {isFloating && videoElement && !isInIframe && (
        <FloatingVideo
          videoElement={videoElement}
          shouldShowHeatmap={!!shouldShowHeatmap}
        />
      )}
    </div>
  )
}
