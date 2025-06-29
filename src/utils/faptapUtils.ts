import { saveScript } from '@/utils/saveScripts'

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
  let videoUrl =
    data.stream_url ||
    (data.stream_url_selfhosted?.includes('faptap')
      ? ''
      : data.stream_url_selfhosted)

  // Replace mediadelivery.net/play with /embed
  if (videoUrl && videoUrl.includes('https://iframe.mediadelivery.net/play')) {
    videoUrl = videoUrl.replace(
      'https://iframe.mediadelivery.net/play',
      'https://iframe.mediadelivery.net/embed',
    )
  }

  const creator = data.user.username
  const supportUrl =
    data.user.profile?.support_url || `https://faptap.net/u/${creator}`

  if (!videoUrl) {
    throw new Error('No video URL available')
  }

  const result = await saveScript(videoUrl, scriptUrl, {
    name: data.name,
    creator,
    supportUrl,
    isDefault: true,
  })

  if (!result) {
    throw new Error('Failed to save script')
  }

  window.open(videoUrl, '_blank')
}
