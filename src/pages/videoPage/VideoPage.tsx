import { useState } from 'react'
import { Controls } from '@/components/controls/Controls'
import { FloatingVideoWindow } from '@/components/floatingVideoWindow/FloatingVideoWindow'
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
  const [showFloatingWindow, setShowFloatingWindow] = useState(false)

  useSettingsSetup()
  useDeviceSetup()

  const showHeatmap = useSettingsStore((state) => state.showHeatmap)
  const videoElement = useVideoStore((state) => state.videoElement)

  const handleOpenFloatingWindow = () => {
    if (videoElement) {
      setShowFloatingWindow(true)
    }
  }

  const handleCloseFloatingWindow = () => {
    setShowFloatingWindow(false)
  }

  return (
    <div className={styles.videoPage}>
      <VideoPanel
        scripts={scripts}
        onOpenFloatingWindow={handleOpenFloatingWindow}
      />
      {showHeatmap && <Controls />}

      {/* {showFloatingWindow && videoElement && (
        <FloatingVideoWindow
          videoElement={videoElement}
          onClose={handleCloseFloatingWindow}
        />
      )} */}
    </div>
  )
}
