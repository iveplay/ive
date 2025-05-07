import { Switch } from '@mantine/core'
import { useShallow } from 'zustand/shallow'
import { useSettingsStore } from '@/store/useSettingsStore'
import styles from './Settings.module.scss'

export const Settings = () => {
  const { showHeatmap, setShowHeatmap } = useSettingsStore(
    useShallow((state) => ({
      showHeatmap: state.showHeatmap,
      setShowHeatmap: state.setShowHeatmap,
    })),
  )

  return (
    <div className={styles.settings}>
      <div className={styles.settingItem}>
        <div className={styles.settingLabel}>Enable Heatmap</div>
        <Switch
          checked={showHeatmap}
          onChange={(event) => setShowHeatmap(event.currentTarget.checked)}
          size='sm'
          color='#7b024d'
        />
      </div>
    </div>
  )
}
