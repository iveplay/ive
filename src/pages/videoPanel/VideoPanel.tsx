import { MESSAGES } from '@background/types'
import clsx from 'clsx'
import { useState, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import logoImg from '@/assets/logo.png'
import { useVideoListener } from '@/hooks/useVideoListener'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import { IveEntry, ScriptMetadata } from '@/types/ivedb'
import { getEntryWithDetails } from '@/utils/iveDbUtils'
import styles from './VideoPanel.module.scss'

type VideoPanelProps = {
  entry?: IveEntry
  isIvdbScript?: boolean
  disableFloat?: boolean
  hasVideoIframes?: boolean
}

type ScriptOption = {
  url: string
  name: string
  creator: string
  supportUrl?: string
}

export const VideoPanel = ({
  entry,
  isIvdbScript,
  disableFloat,
  hasVideoIframes,
}: VideoPanelProps) => {
  const [currentScript, setCurrentScript] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [scriptOptions, setScriptOptions] = useState<ScriptOption[]>([])
  const [currentScriptInfo, setCurrentScriptInfo] =
    useState<ScriptOption | null>(null)

  const scriptInverted = useDeviceStore(
    (state) => state.scriptInverted || false,
  )
  const setScriptInverted = useDeviceStore((state) => state.setScriptInverted)
  const scriptUrl = useDeviceStore((state) => state.scriptUrl)

  const {
    videoElement,
    isSearching,
    error: videoError,
    searchForVideo,
    isFloating,
    setIsFloating,
    activeScript,
    setActiveScript,
  } = useVideoStore(
    useShallow((state) => ({
      videoElement: state.videoElement,
      isSearching: state.isSearching,
      error: state.error,
      searchForVideo: state.searchForVideo,
      isFloating: state.isFloating,
      setIsFloating: state.setIsFloating,
      activeScript: state.activeScript,
      setActiveScript: state.setActiveScript,
    })),
  )

  useVideoListener(videoElement)

  // Load script options from IveDB entry
  useEffect(() => {
    const loadScriptOptions = async () => {
      if (!entry) {
        setScriptOptions([])
        return
      }

      try {
        const entryDetails = await getEntryWithDetails(entry.id)
        if (!entryDetails) {
          setScriptOptions([])
          return
        }

        const options: ScriptOption[] = entryDetails.scripts.map(
          (script: ScriptMetadata) => ({
            url: script.url,
            name: script.creator
              ? `${script.name} - ${script.creator}`
              : script.name,
            creator: script.creator,
            supportUrl: script.supportUrl,
          }),
        )

        setScriptOptions(options)
      } catch (error) {
        console.error(`Error loading entry details for ${entry.id}:`, error)
        setScriptOptions([])
      }
    }

    loadScriptOptions()
  }, [entry])

  // Handle script selection
  const handleScriptSelect = useCallback(
    async (scriptUrl: string) => {
      if (!videoElement) return

      const scriptOption = scriptOptions.find((opt) => opt.url === scriptUrl)
      if (!scriptOption) return

      setCurrentScript(scriptUrl)
      setCurrentScriptInfo(scriptOption)
      setActiveScript(scriptUrl)
      setErrorMessage(null)
      setIsLoading(true)

      try {
        console.log('Loading script:', scriptUrl)
        await chrome.runtime.sendMessage({
          type: MESSAGES.LOAD_SCRIPT_URL,
          url: scriptUrl,
        })

        // Start playback if video is already playing
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
        setCurrentScriptInfo(null)
        setActiveScript(null)
        setErrorMessage(
          `Error loading script: ${e instanceof Error ? e.message : String(e)}`,
        )
        setIsLoading(false)
      }
    },
    [videoElement, setActiveScript, scriptOptions],
  )

  // Auto-select first script
  useEffect(() => {
    if (videoElement && !currentScript && scriptOptions.length > 0) {
      console.log('Auto loading first script')
      handleScriptSelect(scriptOptions[0].url)
    }
  }, [videoElement, currentScript, scriptOptions, handleScriptSelect])

  // Cleanup on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      chrome.runtime.sendMessage({ type: MESSAGES.STOP })
      setActiveScript(null)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setActiveScript(null)
    }
  }, [setActiveScript])

  const isError = !!(videoError || errorMessage)
  const hasScripts = scriptOptions.length > 0
  const isActive = scriptUrl === activeScript

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
          {hasScripts && (
            <button
              className={styles.syncButton}
              onClick={() => currentScript && handleScriptSelect(currentScript)}
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
                isActive ? styles.playing : styles.stopped,
              )}
            >
              {isActive ? 'Syncing' : 'Not syncing'}
            </span>
          </div>
          {hasScripts && !isIvdbScript && (
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

        {scriptOptions.length > 1 && (
          <div className={styles.scriptDropdownContainer}>
            <select
              className={styles.scriptDropdown}
              value={currentScript || ''}
              onChange={(e) => handleScriptSelect(e.target.value)}
              disabled={isLoading}
            >
              {scriptOptions.map((option) => (
                <option key={option.url} value={option.url}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentScriptInfo && (
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
