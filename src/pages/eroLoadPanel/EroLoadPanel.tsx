import { useState, useEffect, useRef, useCallback } from 'react'
import logoImg from '@/assets/logo.png'
import {
  EroscriptContent,
  eroscriptDetectContent,
} from '@/utils/eroscriptDetectContent'
import { extractTopicOwnerInfo, getScriptLinkName } from '@/utils/eroscripts'
import { saveScript } from '@/utils/saveScripts'
import styles from './EroLoadPanel.module.scss'

export const EroLoadPanel = () => {
  const mountedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [autoDetected, setAutoDetected] = useState<EroscriptContent>({
    scripts: [],
    videos: [],
  })
  const [selectedScript, setSelectedScript] = useState<string>('')
  const [selectedVideo, setSelectedVideo] = useState<string>('')

  const detectContent = useCallback(() => {
    const detected = eroscriptDetectContent()
    setAutoDetected(detected)

    if (detected.scripts.length > 0 && !selectedScript) {
      setSelectedScript(detected.scripts[0].url)
    }
    if (detected.videos.length > 0 && !selectedVideo) {
      setSelectedVideo(detected.videos[0].url)
    }
  }, [selectedScript, selectedVideo])

  // Set up mutation observer to detect new posts
  useEffect(() => {
    const postStream = document.querySelector('.post-stream')
    if (!postStream) return

    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if new posts were added
          mutation.addedNodes.forEach((node) => {
            if (
              node instanceof Element &&
              (node.classList.contains('topic-post') ||
                node.querySelector('.topic-post'))
            ) {
              shouldRedetect = true
            }
          })
        }
      })

      if (shouldRedetect) {
        setTimeout(() => detectContent(), 500)
      }
    })

    observer.observe(postStream, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [detectContent])

  useEffect(() => {
    if (mountedRef.current === false) {
      mountedRef.current = true

      detectContent()
    }
  }, [detectContent])

  const saveAndLoadScript = async () => {
    if (!selectedScript || !selectedVideo) return

    setIsLoading(true)

    try {
      const ownerInfo = extractTopicOwnerInfo()
      const scriptName = selectedScript
        ? autoDetected.scripts.find((s) => s.url === selectedScript)?.name
        : getScriptLinkName(selectedScript)

      const result = await saveScript(selectedVideo, selectedScript, {
        name: scriptName || 'EroScript',
        creator: ownerInfo.username || 'Unknown',
        supportUrl: window.location.href,
        isDefault: false,
      })

      if (!result) {
        throw new Error('Failed to save script')
      }

      window.open(selectedVideo, '_blank')
    } finally {
      setIsLoading(false)
    }
  }

  const canLoad = selectedScript && selectedVideo

  return (
    <div className={styles.container}>
      <div className={styles.loadPanel}>
        <img
          src={chrome.runtime.getURL(logoImg)}
          alt='IVE'
          className={styles.logo}
        />

        <select
          className={styles.select}
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
        >
          <option value=''>Choose video...</option>
          {autoDetected.videos.map((video, index) => (
            <option key={index} value={video.url}>
              {video.label}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={selectedScript}
          onChange={(e) => setSelectedScript(e.target.value)}
        >
          <option value=''>Choose script...</option>
          {autoDetected.scripts.map((script, index) => (
            <option key={index} value={script.url}>
              {script.name}
            </option>
          ))}
        </select>

        <button
          className={styles.loadButton}
          onClick={saveAndLoadScript}
          disabled={!canLoad || isLoading}
        >
          {isLoading ? 'Loading...' : 'Load & Play'}
        </button>
      </div>
    </div>
  )
}
