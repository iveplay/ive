import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import { saveScript } from '@/utils/saveScripts'
import styles from './FaptapPanel.module.scss'

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
    script?: {
      url?: string
    }
  }
}

export const FaptapPanel = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    try {
      setIsLoading(true)

      const url = window.location.href
      const videoId = url.split('/').pop()

      if (!videoId) {
        throw new Error('Could not extract video ID from URL')
      }

      const response = await fetch(`https://faptap.net/api/videos/${videoId}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const { data }: FaptapVideoResponse = await response.json()

      if (!data.script?.url) {
        throw new Error('No script available for this video')
      }

      const scriptUrl = `https://faptap.net/api/assets/${data.script.url}`
      const videoUrl = data.stream_url
      const creator = data.user.username
      const supportUrl =
        data.user.profile?.support_url || `https://faptap.net/u/${creator}`

      await saveScript(videoUrl, scriptUrl, {
        name: data.name,
        creator,
        supportUrl,
        isDefault: true,
      })

      window.open(videoUrl, '_blank')
    } catch (error) {
      console.error('Error loading FapTap script:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      className={clsx(styles.openPanel, { [styles.loading]: isLoading })}
      onClick={handleClick}
      disabled={isLoading}
    >
      <img
        src={chrome.runtime.getURL(logoImg)}
        alt='IVE'
        className={styles.logo}
      />
    </button>
  )
}
