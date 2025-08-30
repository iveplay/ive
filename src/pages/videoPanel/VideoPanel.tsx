import { MESSAGES } from '@background/types'
import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import logoImg from '@/assets/logo.png'
import { useVideoListener } from '@/hooks/useVideoListener'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import styles from './VideoPanel.module.scss'

type VideoPanelProps = {
  scripts?: Scripts
  isIvdbScript?: boolean
  disableFloat?: boolean
  hasVideoIframes?: boolean
}

export const VideoPanel = ({
  scripts,
  isIvdbScript,
  disableFloat,
  hasVideoIframes,
}: VideoPanelProps) => {
  const scriptEntries = Object.entries(scripts || {})

  const [currentScript, setCurrentScript] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const scriptInverted = useDeviceStore(
    (state) => state.scriptInverted || false,
  )
  const setScriptInverted = useDeviceStore((state) => state.setScriptInverted)

  const {
    videoElement,
    isSearching,
    error: videoError,
    searchForVideo,
    isFloating,
    setIsFloating,
    setActiveScript,
  } = useVideoStore(
    useShallow((state) => ({
      videoElement: state.videoElement,
      isSearching: state.isSearching,
      error: state.error,
      searchForVideo: state.searchForVideo,
      isFloating: state.isFloating,
      setIsFloating: state.setIsFloating,
      setActiveScript: state.setActiveScript,
    })),
  )

  const { isPlaying } = useVideoListener(videoElement)

  // Handle script selection
  const handleScriptSelect = useCallback(
    async (scriptUrl: string) => {
      if (!videoElement) return

      setCurrentScript(scriptUrl)
      setActiveScript(scriptUrl)
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
        setActiveScript(null)
        setErrorMessage(
          `Error loading script: ${e instanceof Error ? e.message : String(e)}`,
        )
        setIsLoading(false)
      }
    },
    [videoElement, setActiveScript],
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
      setActiveScript(null)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setActiveScript(null)
    }
  }, [setActiveScript])

  const currentScriptInfo = currentScript ? scripts?.[currentScript] : null
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
              <button className={styles.retryButton} onClick={searchForVideo}>
                Search again
              </button>
            )}
          </div>
        )}
        <div className={styles.actions}>
          {scripts && (
            <button
              className={styles.syncButton}
              onClick={() => handleScriptSelect(currentScript || '')}
              disabled={isLoading}
            >
              Sync
            </button>
          )}
          {!disableFloat && (
            <button
              className={styles.floatButton}
              onClick={() => {
                setExpanded(false)
                setIsFloating(!isFloating)
              }}
              disabled={!videoElement && !hasVideoIframes}
              title='Open floating video window'
            >
              Float
            </button>
          )}
        </div>
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
          {scripts && !isIvdbScript && (
            <div className={styles.invertContainer}>
              <span className={styles.label}>Invert:</span>
              <label className={styles.switch}>
                <input
                  type='checkbox'
                  checked={scriptInverted}
                  onChange={() => setScriptInverted(!scriptInverted)}
                  disabled={isLoading || !currentScript}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          )}
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
