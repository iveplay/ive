import { CreateIveEntryData } from '@/types/ivedb'
import { createEntry } from '@/utils/iveDbUtils'

type FaptapVideoResponse = {
  data: {
    id: string
    name: string
    user: {
      username: string
      profile?: {
        support_url?: string
      }
    }
    stream_url: string
    stream_url_selfhosted?: string
    script?: {
      url?: string
    }
  }
}

export const loadFaptapScript = async (videoId: string): Promise<void> => {
  const response = await fetch(`https://faptap.net/api/videos/${videoId}`)

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  const { data }: FaptapVideoResponse = await response.json()

  if (!data.script?.url) {
    throw new Error('No script available for this video')
  }

  const scriptUrl = `https://faptap.net/api/assets/${data.script.url}`
  const videoUrl =
    data.stream_url ||
    (data.stream_url_selfhosted?.includes('faptap')
      ? ''
      : data.stream_url_selfhosted)

  if (!videoUrl) {
    throw new Error('No video URL available')
  }

  const creator = data.user.username
  const supportUrl =
    data.user.profile?.support_url || `https://faptap.net/u/${creator}`

  const createData: CreateIveEntryData = {
    title: data.name,
    tags: ['faptap'],
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
        creator,
        supportUrl,
      },
    ],
  }

  await createEntry(createData)
  window.open(videoUrl, '_blank')
}
