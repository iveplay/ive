import { useState, useCallback } from 'react'
import { DraggableModal } from '@/components/draggableModal/DraggableModal'
import { useVideoElement } from '@/hooks/useVideoElement'
import { Scripts } from '@/types/script'
import styles from './VideoPanel.module.scss'

type VideoPanelProps = {
  scripts: Scripts
}

export const VideoPanel = ({ scripts }: VideoPanelProps) => {
  const scriptEntries = Object.entries(scripts)

  const { videoElement, isSearching, error, retry } = useVideoElement()

  const [currentScript, setCurrentScript] = useState<string | null>(
    scriptEntries.find(([, info]) => info.isDefault)?.[0] ?? null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Handle script selection
  const handleScriptSelect = useCallback(
    async (scriptUrl: string) => {
      if (!videoElement) return

      setCurrentScript(scriptUrl)
      setErrorMessage(null)
      setIsLoading(true)

      try {
        // Here we would load the script with the background service
        console.log('Loading script:', scriptUrl)

        // For now, just simulate a successful load
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      } catch (e) {
        setCurrentScript(null)
        setErrorMessage(
          `Error loading script: ${e instanceof Error ? e.message : String(e)}`,
        )
      } finally {
        setIsLoading(false)
      }
    },
    [videoElement],
  )

  return (
    <DraggableModal
      className={styles.videoPanel}
      headerContent={
        <div className={styles.statusSection}>
          <div
            className={`${styles.statusDot} ${videoElement ? styles.active : ''} ${isSearching ? styles.searching : ''}`}
          ></div>
          <span className={styles.statusText}>
            {isSearching
              ? 'Searching for video...'
              : videoElement
                ? currentScript
                  ? 'Script active'
                  : 'Video detected'
                : 'No video detected'}
          </span>
        </div>
      }
      storageKey='ive-video-panel-position'
      bounds='#crx-root'
    >
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>{error}</div>
          <button
            className={styles.retryButton}
            onClick={retry}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search again'}
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>{errorMessage}</div>
        </div>
      )}

      {videoElement && scriptEntries.length > 0 && (
        <div className={styles.scriptSection}>
          <div className={styles.scriptSelector}>
            <select
              className={styles.scriptSelect}
              value={currentScript || ''}
              onChange={(e) => handleScriptSelect(e.target.value)}
              disabled={isLoading}
            >
              <option value=''>Select a script</option>
              {scriptEntries.map(([url, info]) => (
                <option key={url} value={url}>
                  {info.name} by {info.creator}
                </option>
              ))}
            </select>

            {currentScript && (
              <div className={styles.scriptInfo}>
                <div className={styles.scriptName}>
                  {scripts[currentScript].name}
                </div>
                <div className={styles.scriptCreator}>
                  by {scripts[currentScript].creator}
                </div>

                {scripts[currentScript].supportUrl && (
                  <a
                    href={scripts[currentScript].supportUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.supportLink}
                  >
                    Support Creator
                  </a>
                )}
              </div>
            )}

            {isLoading && (
              <div className={styles.loadingIndicator}>Loading script...</div>
            )}
          </div>
        </div>
      )}

      {videoElement && scriptEntries.length === 0 && (
        <div className={styles.noScripts}>
          No scripts available for this video
        </div>
      )}

      {!videoElement && !error && !isSearching && (
        <div className={styles.noVideoMessage}>
          Looking for video on this page...
        </div>
      )}
    </DraggableModal>
  )
}
