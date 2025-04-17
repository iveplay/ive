import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import { useHandySetup, useHandyStore } from '@/store/useHandyStore'
import {
  usePreferencesSetup,
  usePreferencesStore,
} from '@/store/usePreferencesStore'
import { InfoPanel } from '../infoPanel/InfoPanel'
import { LoadPanel } from '../loadPanel/LoadPanel'
import styles from './ContentApp.module.scss'

export const ContentApp = () => {
  const [currentPageUrl, setCurrentPageUrl] = useState(window.location.href)
  const [scriptUrl, setScriptUrl] = useState<string | null>(null)

  const { preferences, isLoaded } = usePreferencesStore(
    useShallow((state) => ({
      preferences: state.preferences,
      isLoaded: state.isLoaded,
    })),
  )

  const { getCustomScriptForUrl } = useHandyStore(
    useShallow((state) => ({
      getCustomScriptForUrl: state.getCustomScriptForUrl,
    })),
  )

  // Reset script when URL changes
  useEffect(() => {
    const checkUrlChange = () => {
      const newUrl = window.location.href
      if (newUrl !== currentPageUrl) {
        setCurrentPageUrl(newUrl)
      }
    }

    // Check URL changes
    const intervalId = setInterval(checkUrlChange, 1000)

    return () => clearInterval(intervalId)
  }, [currentPageUrl])

  // Check if we have a custom script for this URL
  useEffect(() => {
    const checkCustomScript = async () => {
      try {
        const customScript = await getCustomScriptForUrl(currentPageUrl)
        if (customScript) {
          console.log('Found custom script for URL:', customScript)
          setScriptUrl(customScript)
        }
      } catch (e) {
        console.error('Error checking custom script:', e)
      }
    }

    checkCustomScript()
  }, [currentPageUrl, getCustomScriptForUrl])

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!scriptUrl)
  usePreferencesSetup()

  const showLoadPanel =
    currentPageUrl.includes('discuss.eroscripts.com/t/') &&
    preferences.showLoadPanel
  const showInfoPanel = !!scriptUrl && preferences.showInfoPanel

  if (!isLoaded) {
    return null
  }

  return (
    <div className={styles.contentApp}>
      {showInfoPanel ? (
        <InfoPanel script={scriptUrl!} scriptMetadata={null} />
      ) : null}
      {showLoadPanel && <LoadPanel />}
    </div>
  )
}
