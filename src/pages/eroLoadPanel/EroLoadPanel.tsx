import { useState, useRef, useCallback, DragEvent } from 'react'
import logoImg from '@/assets/logo.png'
import { extractTopicOwnerInfo, getScriptLinkName } from '@/utils/eroscripts'
import { getScripts, saveScripts } from '@/utils/idb-client'
import styles from './EroLoadPanel.module.scss'

export const EroLoadPanel = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [script, setScript] = useState<{ url: string; script: string | null }>({
    url: '',
    script: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const processDroppedUrl = useCallback(
    (url: string) => {
      if (url.endsWith('.funscript') || url.endsWith('.csv')) {
        setScript({ url: script?.url ?? '', script: url })
      } else {
        setScript({ url, script: script?.script ?? null })
      }
    },
    [script],
  )

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    // Check for URLs
    const url =
      e.dataTransfer?.getData('text/uri-list') ||
      e.dataTransfer?.getData('text') ||
      e.dataTransfer?.getData('text/plain')

    if (url) {
      processDroppedUrl(url)
    }
  }

  const saveAndLoadScript = async () => {
    if (!script.url || !script.script) {
      return
    }

    setIsLoading(true)

    try {
      const scripts = await getScripts()

      const currentUrl = script.url
      const scriptUrl = script.script

      if (!scripts[currentUrl]) {
        scripts[currentUrl] = {}
      }

      const ownerInfo = extractTopicOwnerInfo()
      const scriptName = getScriptLinkName(scriptUrl)

      scripts[currentUrl][scriptUrl] = {
        name: scriptName ?? '',
        creator: ownerInfo.username ?? '',
        supportUrl: window.location.href,
        isDefault: false,
      }

      await saveScripts(scripts)

      window.open(currentUrl, '_blank')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.openPanel}
        onClick={() => setIsPopupOpen(!isPopupOpen)}
      >
        <img
          src={chrome.runtime.getURL(logoImg)}
          alt='Logo'
          className={styles.logo}
        />
      </button>

      {isPopupOpen && (
        <div className={styles.popup}>
          <div
            className={`${styles.loadPanel} ${dragActive ? styles.dragActive : ''}`}
          >
            <h4 className={styles.title}>Drag script and video URL here</h4>
            <div
              ref={dropAreaRef}
              className={styles.dropZone}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className={styles.dropInstructions}>
                {dragActive ? 'Drop now!' : 'Drag here'}
              </p>
              <p className={styles.dropScript}>{script.script}</p>
              <p className={styles.dropScript}>{script.url}</p>
            </div>
            <button
              className={styles.loadButton}
              onClick={saveAndLoadScript}
              disabled={!script.script || !script.url || isLoading}
            >
              {isLoading ? 'Loading...' : 'Load and play'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
