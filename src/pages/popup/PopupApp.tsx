import { createTheme, MantineProvider } from '@mantine/core'
import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation/Navigation'
import { Preferences } from '@/pages/preferences/Preferences'
import { useHandySetup } from '@/store/useHandyStore'
import { HandyConnect } from '../handyConnect/HandyConnect'
import styles from './PopupApp.module.scss'

const theme = createTheme({})

export const PopupApp = () => {
  const [activeScreen, setActiveScreen] = useState('device')
  useHandySetup('popup', true)

  // Load last active screen from storage
  useEffect(() => {
    const loadActiveScreen = async () => {
      try {
        const data = await chrome.storage.local.get('ive-active-screen')
        if (data['ive-active-screen']) {
          setActiveScreen(data['ive-active-screen'])
        }
      } catch (error) {
        console.error('Error loading active screen:', error)
      }
    }

    loadActiveScreen()
  }, [])

  // Save active screen to storage
  const handleScreenChange = async (screen: string) => {
    setActiveScreen(screen)
    try {
      await chrome.storage.local.set({ 'ive-active-screen': screen })
    } catch (error) {
      console.error('Error saving active screen:', error)
    }
  }

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
        <Navigation
          activeScreen={activeScreen}
          onNavigate={handleScreenChange}
        />
        <div className={styles.screenContainer}>{renderActiveScreen()}</div>
      </div>
    </MantineProvider>
  )
}
