import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addScriptToContent,
  addVideoToContent,
  DetectedScript,
  DetectedVideo,
  EroscriptContent,
  eroscriptDetectContent,
} from '@/utils/eroscriptDetectContent'

export const useDetectContent = () => {
  const mountedRef = useRef(false)
  const currentUrlRef = useRef(window.location.href)
  const [autoDetected, setAutoDetected] = useState<EroscriptContent>({
    scripts: [],
    videos: [],
  })
  const [selectedScript, setSelectedScript] = useState<DetectedScript | null>(
    null,
  )
  const [selectedVideo, setSelectedVideo] = useState<DetectedVideo | null>(null)

  const detectContent = useCallback(() => {
    const detected = eroscriptDetectContent()
    setAutoDetected(detected)

    if (detected.scripts.length > 0 && !selectedScript) {
      setSelectedScript(detected.scripts[0])
    }
    if (detected.videos.length > 0 && !selectedVideo) {
      setSelectedVideo(detected.videos[0])
    }
  }, [selectedScript, selectedVideo])

  const addContent = useCallback(
    (url: string, type: 'video' | 'script') => {
      if (type === 'video') {
        const updated = addVideoToContent(autoDetected, url)
        setAutoDetected(updated)
        setSelectedVideo(updated.videos[updated.videos.length - 1])
      } else {
        const updated = addScriptToContent(autoDetected, url)
        setAutoDetected(updated)
        setSelectedScript(updated.scripts[updated.scripts.length - 1])
      }
    },
    [autoDetected, setSelectedScript, setSelectedVideo],
  )

  useEffect(() => {
    if (mountedRef.current === false) {
      mountedRef.current = true
      detectContent()
    }
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

  // Monitor URL changes to detect scrolling / new posts
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
        setSelectedScript(null)
        setSelectedVideo(null)
        setTimeout(() => detectContent(), 500)
      } else {
        currentUrlRef.current = currentUrl
      }
    }

    // Check for URL changes every 500ms
    const urlCheckInterval = setInterval(checkUrlChange, 500)

    return () => clearInterval(urlCheckInterval)
  }, [detectContent])

  return {
    autoDetected,
    selectedScript,
    setSelectedScript,
    selectedVideo,
    setSelectedVideo,
    addContent,
  }
}
