import { CONTEXT_MESSAGES } from '@background/types'
import { useState, useEffect, useRef, useCallback } from 'react'
import logoImg from '@/assets/logo.png'
import {
  EroscriptContent,
  eroscriptDetectContent,
  addVideoToContent,
  addScriptToContent,
} from '@/utils/eroscriptDetectContent'
import { extractTopicOwnerInfo, getScriptLinkName } from '@/utils/eroscripts'
import { saveScript } from '@/utils/saveScripts'
import styles from './EroLoadPanel.module.scss'

export const EroLoadPanel = () => {
  const mountedRef = useRef(false)
  const currentUrlRef = useRef(window.location.href)
  const [isLoading, setIsLoading] = useState(false)
  const [autoDetected, setAutoDetected] = useState<EroscriptContent>({
    scripts: [],
    videos: [],
  })
  const [selectedScript, setSelectedScript] = useState<string>('')
  const [selectedVideo, setSelectedVideo] = useState<string>('')
  const [dragOverTarget, setDragOverTarget] = useState<
    'video' | 'script' | null
  >(null)

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

  const addContent = useCallback(
    (url: string, type: 'video' | 'script') => {
      if (type === 'video') {
        const updated = addVideoToContent(autoDetected, url)
        setAutoDetected(updated)
        setSelectedVideo(url)
      } else {
        const updated = addScriptToContent(autoDetected, url)
        setAutoDetected(updated)
        setSelectedScript(url)
      }
    },
    [autoDetected],
  )

  // Listen for context menu messages
  useEffect(() => {
    const handleMessage = (message: { type: string; url: string }) => {
      switch (message.type) {
        case CONTEXT_MESSAGES.EROSCRIPTS_VIDEO:
          addContent(message.url, 'video')
          break
        case CONTEXT_MESSAGES.EROSCRIPTS_SCRIPT:
          addContent(message.url, 'script')
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [addContent])

  useEffect(() => {
    const getThreadUrl = (url: string) => {
      return url.split('/').slice(0, 6).join('/')
    }

    const checkUrlChange = () => {
      const currentUrl = window.location.href
      const currentThreadUrl = getThreadUrl(currentUrl)
      const prevThreadUrl = getThreadUrl(currentUrlRef.current)

      if (currentThreadUrl !== prevThreadUrl) {
        currentUrlRef.current = currentUrl
        // Reset selections when navigating to new thread
        setSelectedScript('')
        setSelectedVideo('')
        setTimeout(() => detectContent(), 500)
      } else {
        currentUrlRef.current = currentUrl
      }
    }

    // Check for URL changes every 500ms
    const urlCheckInterval = setInterval(checkUrlChange, 500)

    return () => clearInterval(urlCheckInterval)
  }, [detectContent])

  // Set up mutation observer to detect new posts
  useEffect(() => {
    const postStream = document.querySelector('.post-stream')
    if (!postStream) return

    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
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

  const handleDragOver = useCallback(
    (e: React.DragEvent, target: 'video' | 'script') => {
      e.preventDefault()
      setDragOverTarget(target)
    },
    [],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) {
      setDragOverTarget(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, target: 'video' | 'script') => {
      e.preventDefault()
      setDragOverTarget(null)

      const url =
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text/uri-list')

      if (!url) return

      try {
        new URL(url.startsWith('http') ? url : `https://${url}`)

        if (target === 'script' && url.endsWith('.funscript')) {
          addContent(url, 'script')
        } else if (target === 'video' && !url.endsWith('.funscript')) {
          addContent(url, 'video')
        }
      } catch {
        // Invalid URL, ignore
      }
    },
    [addContent],
  )

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
          className={`${styles.select} ${dragOverTarget === 'video' ? styles.dragOver : ''}`}
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          onDragOver={(e) => handleDragOver(e, 'video')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'video')}
        >
          <option value=''>Choose video...</option>
          {autoDetected.videos.map((video, index) => (
            <option key={`${video.url}-${index}`} value={video.url}>
              {video.label}
            </option>
          ))}
        </select>

        <select
          className={`${styles.select} ${dragOverTarget === 'script' ? styles.dragOver : ''}`}
          value={selectedScript}
          onChange={(e) => setSelectedScript(e.target.value)}
          onDragOver={(e) => handleDragOver(e, 'script')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'script')}
        >
          <option value=''>Choose script...</option>
          {autoDetected.scripts.map((script, index) => (
            <option key={`${script.url}-${index}`} value={script.url}>
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
