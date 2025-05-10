import { EVENTS } from '@background/types'
import { saveScript } from '@/utils/saveScripts'

export const setupIveEventApi = () => {
  document.addEventListener(EVENTS.SAVE_SCRIPT, async (event) => {
    const { videoUrl, scriptUrl, scriptInfo } = (event as CustomEvent).detail

    try {
      await saveScript(videoUrl, scriptUrl, scriptInfo)
    } catch (error) {
      console.error('Error saving script:', error)
    }
  })
}
