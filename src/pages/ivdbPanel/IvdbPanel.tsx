import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
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

  useDeviceSetup()

  const handyConnectionKey = useDeviceStore((state) => state.handyConnectionKey)

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
      const creator =
        bestScript.scripter?.name || videoData.partnerName || 'IVDB'

      // Save the IVDB script reference instead of the token URL
      const ivdbScriptUrl = `ivdb://${videoId}/${bestScript.scriptId}`

      const result = await saveScript(videoData.videoUrl, ivdbScriptUrl, {
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
      title={
        !handyConnectionKey
          ? 'Connect with The Handy through the IVE extension'
          : ''
      }
      className={clsx(styles.openPanel, {
        [styles.loading]: isLoading || !handyConnectionKey,
      })}
      onClick={handleClick}
      disabled={isLoading || !handyConnectionKey}
    >
      <img
        src={chrome.runtime.getURL(logoImg)}
        alt='IVE'
        className={styles.logo}
      />
    </button>
  )
}
