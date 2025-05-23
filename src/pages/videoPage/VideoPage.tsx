import { Heatmap } from '@/components/heatmap/Heatmap'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
import { useSettingsStore, useSettingsSetup } from '@/store/useSettingsStore'
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
  const funscript = useDeviceStore((state) => state.funscript)

  return (
    <div className={styles.videoPage}>
      <VideoPanel scripts={scripts} />
      {showHeatmap && <Heatmap funscript={funscript} />}
    </div>
  )
}
