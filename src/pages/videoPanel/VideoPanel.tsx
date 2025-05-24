import { MESSAGES } from '@background/types'
import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import logoImg from '@/assets/logo.png'
import { useVideoElement } from '@/hooks/useVideoElement'
import { useVideoListener } from '@/hooks/useVideoListener'
import { useVideoUpdater } from '@/hooks/useVideoUpdater'
import { Scripts } from '@/types/script'
import styles from './VideoPanel.module.scss'

type VideoPanelProps = {
  scripts: Scripts
}

export const VideoPanel = ({ scripts }: VideoPanelProps) => {
  const scriptEntries = Object.entries(scripts)

  const [currentScript, setCurrentScript] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const {
    videoElement,
    isSearching,
    error: videoError,
    retry,
  } = useVideoElement()

  useVideoListener(videoElement, currentScript, setIsPlaying)
  useVideoUpdater(videoElement)

  // Handle script selection
  const handleScriptSelect = useCallback(
    async (scriptUrl: string) => {
      if (!videoElement) return

      setCurrentScript(scriptUrl)
      setErrorMessage(null)
      setIsLoading(true)

      try {
        // Load the script with the background service
        console.log('Loading script:', scriptUrl)
        await chrome.runtime.sendMessage({
          type: MESSAGES.LOAD_SCRIPT_URL,
          url: scriptUrl,
        })

        // If video is already playing, start haptic playback immediately
        if (!videoElement.paused) {
          console.log('Video is playing, starting haptic playback')
          await chrome.runtime.sendMessage({
            type: MESSAGES.PLAY,
            timeMs: videoElement.currentTime * 1000,
            playbackRate: videoElement.playbackRate,
            duration: videoElement.duration * 1000,
            loop: false,
          })
        }

        setIsLoading(false)
      } catch (e) {
        setCurrentScript(null)
        setErrorMessage(
          `Error loading script: ${e instanceof Error ? e.message : String(e)}`,
        )
        setIsLoading(false)
      }
    },
    [videoElement],
  )

  // Select script on load
  useEffect(() => {
    if (videoElement && !currentScript) {
      const defaultScript = scriptEntries.find(([, info]) => info.isDefault)
      console.log('Auto loading script')
      if (defaultScript) {
        handleScriptSelect(defaultScript[0])
      } else if (scriptEntries.length > 0) {
        handleScriptSelect(scriptEntries[0][0])
      }
    }
  }, [videoElement, currentScript, scriptEntries, handleScriptSelect])

  // Stop playback when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      chrome.runtime.sendMessage({
        type: MESSAGES.STOP,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const currentScriptInfo = currentScript ? scripts[currentScript] : null
  const isError = !!(videoError || errorMessage)

  return (
    <div
      className={clsx(styles.controlContainer, expanded ? styles.expanded : '')}
    >
      <div
        className={styles.statusButton}
        onClick={() => setExpanded(!expanded)}
      >
        <img
          src={chrome.runtime.getURL(logoImg)}
          alt='Logo'
          className={styles.logo}
        />
      </div>
      <div className={styles.panel}>
        {isError && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{videoError || errorMessage}</p>
            {videoError && (
              <button className={styles.retryButton} onClick={retry}>
                Search again
              </button>
            )}
          </div>
        )}
        <div className={styles.scriptContainer}>
          <div className={styles.status}>
            <span className={styles.label}>Status:</span>
            <span
              className={clsx(
                styles.value,
                isPlaying ? styles.playing : styles.stopped,
              )}
            >
              {isPlaying ? 'Playing' : 'Stopped'}
            </span>
          </div>
          <button
            className={styles.syncButton}
            onClick={() => handleScriptSelect(currentScript || '')}
            disabled={isLoading}
          >
            Sync
          </button>
        </div>
        {scriptEntries.length > 1 && (
          <div className={styles.scriptDropdownContainer}>
            <select
              className={styles.scriptDropdown}
              value={currentScript || ''}
              onChange={(e) => handleScriptSelect(e.target.value)}
              disabled={isLoading || scriptEntries.length === 0}
            >
              {scriptEntries.length === 0 ? (
                <option value='' disabled>
                  No scripts available
                </option>
              ) : (
                <>
                  {scriptEntries.map(([url, info]) => (
                    <option key={url} value={url}>
                      {info.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}
        {currentScript && currentScriptInfo && (
          <div className={styles.scriptInfo}>
            <p className={styles.scriptCreator}>{currentScriptInfo.creator}</p>
            {currentScriptInfo.supportUrl && (
              <a
                href={currentScriptInfo.supportUrl}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.supportLink}
              >
                Support creator
              </a>
            )}
          </div>
        )}
        {(isLoading || isSearching) && (
          <div className={styles.loadingIndicator}>
            {isSearching ? 'Searching video element' : 'Loading'}
          </div>
        )}
      </div>
    </div>
  )
}
