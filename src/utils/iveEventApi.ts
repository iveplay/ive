import { EVENTS } from '@background/types'
import { CreateIveEntryData } from '@/types/ivedb'
import { createEntry } from '@/utils/iveDbUtils'

export const setupIveEventApi = () => {
  document.addEventListener(EVENTS.SAVE_SCRIPT, async (event) => {
    const { videoUrl, scriptUrl, scriptInfo } = (event as CustomEvent).detail

    try {
      const createData: CreateIveEntryData = {
        title: scriptInfo.name,
        tags: ['external'], // or extract from context
        thumbnail: undefined,
        videoSources: [
          {
            url: videoUrl,
            status: 'working' as const,
          },
        ],
        scripts: [
          {
            url: scriptUrl,
            creator: scriptInfo.creator,
            supportUrl: scriptInfo.supportUrl,
          },
        ],
      }

      await createEntry(createData)
    } catch (error) {
      console.error('Error saving script:', error)
    }
  })
}
