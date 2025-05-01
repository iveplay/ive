import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import { useVideoElement } from '@/hooks/useVideoElement'
import { useVideoListener } from '@/hooks/useVideoListener'
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
          type: 'ive:load_script_url',
          url: scriptUrl,
        })

        // If video is already playing, start haptic playback immediately
        if (!videoElement.paused) {
          console.log('Video is playing, starting haptic playback')
          await chrome.runtime.sendMessage({
            type: 'ive:play',
            timeMs: videoElement.currentTime,
            playbackRate: videoElement.playbackRate,
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
        type: 'ive:stop',
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Get current script info
  const currentScriptInfo = currentScript ? scripts[currentScript] : null

  return (
    <div
      className={clsx(styles.controlContainer, expanded ? styles.expanded : '')}
    >
      <div
        className={styles.statusButton}
        onClick={() => setExpanded(!expanded)}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </div>
      <div className={styles.panel}>
        {(videoError || errorMessage) && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{videoError || errorMessage}</p>
            {videoError && (
              <button
                className={styles.retryButton}
                onClick={retry}
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search again'}
              </button>
            )}
          </div>
        )}
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
                  <option value='' disabled>
                    Select script
                  </option>
                  {scriptEntries.map(([url, info]) => (
                    <option key={url} value={url}>
                      {info.name} by {info.creator}
                    </option>
                  ))}
                </>
              )}
            </select>
            {isLoading && (
              <div className={styles.loadingIndicator}>Loading...</div>
            )}
          </div>
        )}
        {currentScript && currentScriptInfo && (
          <div className={styles.scriptInfo}>
            <h4>{currentScriptInfo.name}</h4>
            <p className={styles.scriptCreator}>
              by {currentScriptInfo.creator}
            </p>
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
      </div>
    </div>
  )
}
