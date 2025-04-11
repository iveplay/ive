import { useHandySetup } from '@/store/useHandyStore'
import scripts from '../../../data/scripts.json'
import { ContentApp } from './ContentApp'

type Scripts = {
  [videoUrl: string]: {
    scriptUrl: string
    title: string
    description: string
    user: {
      name: string
      supportUrl: string
      bio: string
    }
  }
}

const typedScripts = scripts as Scripts

export const ContentWrapper = () => {
  const url = window.location.href
  const videoUrl = Object.keys(typedScripts).find((key) => url.includes(key))
  const script = videoUrl ? typedScripts[videoUrl]?.scriptUrl : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!script)

  return script ? <ContentApp script={script} /> : null
}
