import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import { useDeviceSetup, useDeviceStore } from '@/store/useDeviceStore'
import { CreateIveEntryData } from '@/types/ivedb'
import { createEntry } from '@/utils/iveDbUtils'
import styles from './IvdbPanel.module.scss'

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

      const [videoData, scripts] = await Promise.all([
        videoResponse.json(),
        scriptsResponse.json(),
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
      const ivdbScriptUrl = `ivdb://${videoId}/${bestScript.scriptId}`

      const createData: CreateIveEntryData = {
        title: videoData.title,
        tags: ['ivdb', ...videoData.tags],
        thumbnail: videoData.thumbnail,
        duration: videoData.duration * 1000,
        videoSources: [
          {
            url: videoData.videoUrl,
            status: 'working' as const,
          },
        ],
        scripts: [
          {
            name: `${bestScript.metadata.actions}actions_${videoData.title}`,
            actionCount: bestScript.metadata.actions,
            url: ivdbScriptUrl,
            creator,
            supportUrl: `https://ivdb.io/#/videos/${videoId}`,
          },
        ],
      }

      await createEntry(createData)
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
