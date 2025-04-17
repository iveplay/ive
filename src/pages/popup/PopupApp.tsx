import { createTheme, MantineProvider } from '@mantine/core'
import { useShallow } from 'zustand/shallow'
import { Navigation } from '@/components/navigation/Navigation'
import { Preferences } from '@/pages/preferences/Preferences'
import { useHandySetup } from '@/store/useHandyStore'
import {
  useNavigationSetup,
  useNavigationStore,
} from '@/store/useNavigationStore'
import { HandyConnect } from '../handyConnect/HandyConnect'
import styles from './PopupApp.module.scss'

const theme = createTheme({})

export const PopupApp = () => {
  const { activeScreen, isLoaded } = useNavigationStore(
    useShallow((state) => ({
      activeScreen: state.activeScreen,
      isLoaded: state.isLoaded,
    })),
  )

  useHandySetup('popup', true)
  useNavigationSetup()

  // Render the active screen
  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'device':
        return <HandyConnect />
      case 'preferences':
        return <Preferences />
      default:
        return <HandyConnect />
    }
  }

  return (
    <MantineProvider theme={theme}>
      <div className={styles.popupApp}>
        <Navigation activeScreen={activeScreen} />
        <div className={styles.screenContainer}>
          {isLoaded ? renderActiveScreen() : null}
        </div>
      </div>
    </MantineProvider>
  )
}
