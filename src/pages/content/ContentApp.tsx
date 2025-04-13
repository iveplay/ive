import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import { useHandySetup, useHandyStore } from '@/store/useHandyStore'
import {
  usePreferencesSetup,
  usePreferencesStore,
} from '@/store/usePreferencesStore'
import scripts from '../../../data/scripts.json'
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

const typedScripts = scripts as Scripts

export const ContentApp = () => {
  const url = window.location.href
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

  // Check if we have a custom script for this URL
  useEffect(() => {
    const checkCustomScript = async () => {
      try {
        const customScript = await getCustomScriptForUrl(url)
        if (customScript) {
          console.log('Found custom script for URL:', customScript)
          setCustomScriptUrl(customScript)
        }
      } catch (e) {
        console.error('Error checking custom script:', e)
      }
    }

    checkCustomScript()
  }, [url, getCustomScriptForUrl])

  // Check if there's a predefined script for this URL
  const videoUrl = Object.keys(typedScripts).find((key) => url.includes(key))
  const scriptUrl =
    customScriptUrl || (videoUrl ? typedScripts[videoUrl]?.scriptUrl : null)
  const scriptMetadata = videoUrl ? typedScripts[videoUrl] : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!scriptUrl)
  usePreferencesSetup()

  const showLoadPanel =
    url.includes('discuss.eroscripts.com/t/') && preferences.showLoadPanel
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
