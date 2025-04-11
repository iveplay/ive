import { useHandySetup } from '@/store/useHandyStore'
import scripts from '../../../data/scripts.json'
import { ContentApp } from './ContentApp'

export const ContentWrapper = () => {
  const url = window.location.href
  const videoUrl = Object.keys(scripts).find((key) => url.includes(key))
  // @ts-expect-error typing
  const script = videoUrl ? scripts[videoUrl]?.scriptUrl : null

  // Only activate connection if we have a script for this site
  useHandySetup('contentScript', !!script)

  return script ? <ContentApp script={script} /> : null
}
