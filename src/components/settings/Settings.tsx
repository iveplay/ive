import { Button, Switch } from '@mantine/core'
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

  const activateVideoPanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'IVE_ACTIVATE_VIDEO_PANEL',
        })
        // Close popup after activation
        window.close()
      }
    } catch (error) {
      console.error('Error activating video panel:', error)
    }
  }

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
      <div className={styles.settingItem}>
        <div className={styles.settingLabel}>Activate Video Panel</div>
        <Button onClick={activateVideoPanel} size='compact-md' color='#7b024d'>
          Open
        </Button>
      </div>
    </div>
  )
}
