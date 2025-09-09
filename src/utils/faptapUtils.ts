import { CreateIveEntryData } from '@/types/ivedb'
import { createEntry } from '@/utils/iveDbUtils'

type FaptapVideoResponse = {
  data: {
    id: string
    name: string
    duration: number
    thumbnail_url: string
    user: {
      username: string
      profile?: {
        support_url?: string
      }
    }
    tags: { id: string; name: string; slug: string }[]
    stream_url: string
    stream_url_selfhosted?: string
    script?: {
      url?: string
      average_speed?: number
      total_actions?: number
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
  const sources: CreateIveEntryData['videoSources'] = []

  // Prefer self-hosted URL if available faptap does this if video isn't available
  if (
    data.stream_url_selfhosted &&
    !data.stream_url_selfhosted.includes('faptap')
  ) {
    sources.push({ url: data.stream_url_selfhosted, status: 'working' })
  }

  if (data.stream_url) {
    sources.push({ url: data.stream_url, status: 'working' })
  }

  if (!sources.length) {
    throw new Error('No video URL available')
  }

  const creator = data.user.username
  const supportUrl =
    data.user.profile?.support_url || `https://faptap.net/u/${creator}`

  const createData: CreateIveEntryData = {
    title: data.name,
    tags: ['faptap', ...data.tags.map((tag) => tag.name)],
    thumbnail: data.thumbnail_url
      ? `https://faptap.net/api/assets/${data.thumbnail_url}`
      : undefined,
    duration: data.duration * 1000,
    videoSources: sources,
    scripts: [
      {
        url: scriptUrl,
        creator,
        supportUrl,
        avgSpeed: data.script.average_speed || undefined,
        actionCount: data.script.total_actions || undefined,
      },
    ],
  }

  await createEntry(createData)
  window.open(sources[0]?.url, '_blank')
}
