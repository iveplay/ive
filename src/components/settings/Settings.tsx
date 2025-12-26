import { CONTEXT_MESSAGES } from '@background/types'
import { Button, Switch, Textarea } from '@mantine/core'
import { useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { useSettingsStore } from '@/store/useSettingsStore'
import styles from './Settings.module.scss'

export const Settings = () => {
  const { showHeatmap, customUrls, setShowHeatmap, setCustomUrls } =
    useSettingsStore(
      useShallow((state) => ({
        showHeatmap: state.showHeatmap,
        customUrls: state.customUrls,
        setShowHeatmap: state.setShowHeatmap,
        setCustomUrls: state.setCustomUrls,
      })),
    )

  const [urlsText, setUrlsText] = useState(() => customUrls.join('\n'))

  const handleUrlsChange = (value: string) => {
    setUrlsText(value)

    // Parse URLs and save
    const urls = value
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .map((url) => {
        // Remove protocol if present for consistent matching
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '')
      })

    setCustomUrls(urls)
  }

  const activateVideoPanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: CONTEXT_MESSAGES.FLOAT_VIDEO,
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
        <div>
          <div className={styles.settingLabel}>Enable Heatmap</div>
          <div className={styles.settingDescription}>
            Doesn't work with IVDB scripts
          </div>
        </div>
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

      <div className={styles.urlListContainer}>
        <div className={styles.settingLabel}>Custom URLs</div>
        <div className={styles.settingDescription}>
          Always show IVE on these sites (one per line)
        </div>
        <Textarea
          value={urlsText}
          onChange={(event) => handleUrlsChange(event.currentTarget.value)}
          placeholder='youtube.com&#10;vimeo.com&#10;twitch.tv'
          rows={4}
          className={styles.urlTextarea}
          styles={{
            input: {
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'white',
              '&:focus': {
                borderColor: '#7b024d',
                boxShadow: '0 0 0 2px rgba(123, 2, 77, 0.3)',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
