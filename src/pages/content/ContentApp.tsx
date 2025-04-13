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

export type ScriptMetadata = {
  scriptUrl: string
  title: string
  description: string
  user: {
    name: string
    supportUrl: string
    bio: string
  }
}

export type Scripts = {
  [videoUrl: string]: ScriptMetadata
}

const scripts: Scripts = {}

export const ContentApp = () => {
  const [currentPageUrl, setCurrentPageUrl] = useState(window.location.href)
  const [customScriptUrl, setCustomScriptUrl] = useState<string | null>(null)

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
          setCustomScriptUrl(customScript)
        }
      } catch (e) {
        console.error('Error checking custom script:', e)
      }
    }

    checkCustomScript()
  }, [currentPageUrl, getCustomScriptForUrl])

  // Check if there's a predefined script for this URL
  const videoUrl = Object.keys(scripts).find((key) =>
    currentPageUrl.includes(key),
  )
  const scriptUrl =
    customScriptUrl || (videoUrl ? scripts[videoUrl]?.scriptUrl : null)
  const scriptMetadata = videoUrl ? scripts[videoUrl] : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!scriptUrl)
  usePreferencesSetup()

  const showLoadPanel =
    currentPageUrl.includes('discuss.eroscripts.com/t/') &&
    preferences.showLoadPanel
  const showInfoPanel = !!scriptUrl && preferences.showInfoPanel

  if (!isLoaded) {
    return <div className={styles.contentApp} />
  }

  return (
    <div className={styles.contentApp}>
      {showInfoPanel ? (
        <InfoPanel script={scriptUrl!} scriptMetadata={scriptMetadata} />
      ) : null}
      {showLoadPanel && <LoadPanel />}
    </div>
  )
}
