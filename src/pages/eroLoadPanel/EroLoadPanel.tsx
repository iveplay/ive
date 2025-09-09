import { CONTEXT_MESSAGES } from '@background/types'
import { useState, useEffect, useCallback } from 'react'
import logoImg from '@/assets/logo.png'
import { CreateIveEntryData } from '@/types/ivedb'
import { getTopicMetadata } from '@/utils/eroscriptDetectContent'
import { createEntry } from '@/utils/iveDbUtils'
import styles from './EroLoadPanel.module.scss'
import { useDetectContent } from './useDetectContent'

export const EroLoadPanel = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [dragOverTarget, setDragOverTarget] = useState<
    'video' | 'script' | null
  >(null)

  const {
    autoDetected,
    selectedScript,
    setSelectedScript,
    selectedVideo,
    setSelectedVideo,
    addContent,
  } = useDetectContent()

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
      const metadata = getTopicMetadata()

      const createData: CreateIveEntryData = {
        ...metadata,
        videoSources: [selectedVideo],
        scripts: [selectedScript],
      }

      const entryId = await createEntry(createData)

      console.log('Created IveDB entry:', entryId)

      window.open(selectedVideo.url, '_blank')
    } catch (error) {
      console.error('Error saving script:', error)
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
          value={selectedVideo?.url || ''}
          onChange={(e) =>
            setSelectedVideo(
              autoDetected.videos.find(
                (video) => video.url === e.target.value,
              ) || null,
            )
          }
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
          value={selectedScript?.url || ''}
          onChange={(e) =>
            setSelectedScript(
              autoDetected.scripts.find(
                (script) => script.url === e.target.value,
              ) || null,
            )
          }
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
