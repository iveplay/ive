import { useHandySetup } from '@/store/useHandyStore'
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
  const videoUrl = Object.keys(typedScripts).find((key) => url.includes(key))

  const scriptUrl = videoUrl ? typedScripts[videoUrl]?.scriptUrl : null
  const scriptMetadata = videoUrl ? typedScripts[videoUrl] : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!scriptUrl)

  const loadPanel = url.includes('discuss.eroscripts.com/t/')

  return (
    <div className={styles.contentApp}>
      {scriptUrl ? (
        <InfoPanel script={scriptUrl} scriptMetadata={scriptMetadata} />
      ) : null}
      {loadPanel && <LoadPanel />}
    </div>
  )
}
