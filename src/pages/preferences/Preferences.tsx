import { Switch, Loader } from '@mantine/core'
import { useShallow } from 'zustand/shallow'
import {
  usePreferencesSetup,
  usePreferencesStore,
} from '@/store/usePreferencesStore'
import styles from './Preferences.module.scss'

export const Preferences = () => {
  usePreferencesSetup()

  const { preferences, isLoaded, setShowInfoPanel, setShowLoadPanel } =
    usePreferencesStore(
      useShallow((state) => ({
        preferences: state.preferences,
        isLoaded: state.isLoaded,
        setShowInfoPanel: state.setShowInfoPanel,
        setShowLoadPanel: state.setShowLoadPanel,
      })),
    )

  if (!isLoaded) {
    return (
      <div className={styles.loaderContainer}>
        <Loader color='#7b024d' size='md' />
      </div>
    )
  }

  return (
    <div className={styles.preferences}>
      <div
        className={styles.preferenceItem}
        onClick={() => {
          setShowInfoPanel(!preferences.showInfoPanel)
        }}
      >
        <Switch
          checked={preferences.showInfoPanel}
          onChange={(event) => setShowInfoPanel(event.currentTarget.checked)}
          label='Show Info Panel'
          color='#7b024d'
          size='md'
        />
        Shows video sync status and controls when a scripted video is detected.
        Shows script creator info.
      </div>

      <div
        className={styles.preferenceItem}
        onClick={() => {
          setShowLoadPanel(!preferences.showLoadPanel)
        }}
      >
        <Switch
          checked={preferences.showLoadPanel}
          onChange={(event) => setShowLoadPanel(event.currentTarget.checked)}
          label='Show Load Script Panel'
          color='#7b024d'
          size='md'
        />
        Appears on script discussion pages. Allows you to drop a script URL and
        video URL to easily play that video.
      </div>
    </div>
  )
}
