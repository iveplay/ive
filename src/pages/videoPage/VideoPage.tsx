import { Heatmap } from '@/components/heatmap/Heatmap'
import { useSettingsStore, useSettingsSetup } from '@/store/useSettingsStore'
import { Scripts } from '@/types/script'
import { VideoPanel } from '../videoPanel/VideoPanel'
import styles from './VideoPage.module.scss'

type VideoPageProps = {
  scripts: Scripts
}

export const VideoPage = ({ scripts }: VideoPageProps) => {
  useSettingsSetup()

  const showHeatmap = useSettingsStore((state) => state.showHeatmap)

  return (
    <div className={styles.videoPage}>
      <VideoPanel scripts={scripts} />
      {showHeatmap && <Heatmap funscript={null} />}
    </div>
  )
}
