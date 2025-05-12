import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import { saveScript } from '@/utils/saveScripts'
import styles from './IvdbPanel.module.scss'

type IvdbVideoResponse = {
  title: string
  videoUrl: string
  partnerName: string
  partnerVideoId: string
}

type IvdbScriptResponse = {
  scriptId: string
  scripter: {
    scripterId: string
    name: string
  }
}

export const IvdbPanel = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    try {
      setIsLoading(true)

      const url = window.location.href
      const videoId = url.split('/videos/').pop()?.split('?')[0]

      if (!videoId) {
        throw new Error('Could not extract video ID from URL')
      }

      // Fetch both video data and scripts in parallel
      const [videoResponse, scriptsResponse] = await Promise.all([
        fetch(
          `https://scripts01.handyfeeling.com/api/script/index/v0/videos/${videoId}`,
        ),
        fetch(
          `https://scripts01.handyfeeling.com/api/script/index/v0/videos/${videoId}/scripts?take=1000`,
        ),
      ])

      if (!videoResponse.ok) {
        throw new Error(`Video API request failed: ${videoResponse.status}`)
      }

      if (!scriptsResponse.ok) {
        throw new Error(`Scripts API request failed: ${scriptsResponse.status}`)
      }

      // Parse both responses in parallel
      const [videoData, scripts] = await Promise.all([
        videoResponse.json() as Promise<IvdbVideoResponse>,
        scriptsResponse.json() as Promise<IvdbScriptResponse[]>,
      ])

      if (!videoData.videoUrl) {
        throw new Error('No video URL available for this content')
      }

      if (!scripts || scripts.length === 0) {
        throw new Error('No scripts available for this video')
      }

      const bestScript = scripts[0]

      // Get the token URL for this script
      const tokenResponse = await fetch(
        `https://scripts01.handyfeeling.com/api/script/index/v0/videos/${videoId}/scripts/${bestScript.scriptId}/token`,
        {
          headers: {
            Authorization: 'Bearer 7ZfVUxRdBQp',
          },
        },
      )

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get script token: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.url) {
        throw new Error('Invalid script token response')
      }

      const creator =
        bestScript.scripter?.name || videoData.partnerName || 'IVDB'

      const result = await saveScript(videoData.videoUrl, tokenData.url, {
        name: videoData.title,
        creator,
        supportUrl: `https://ivdb.io/#/videos/${videoId}`,
        isDefault: true,
      })

      if (!result) {
        throw new Error('Failed to save script')
      }

      window.open(videoData.videoUrl, '_blank')
    } catch (error) {
      console.error('Error loading IVDB script:', error)
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
