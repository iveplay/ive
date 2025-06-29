import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import { loadFaptapScript } from '@/utils/faptapUtils'
import styles from './FaptapPanel.module.scss'

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

      await loadFaptapScript(videoId)
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
