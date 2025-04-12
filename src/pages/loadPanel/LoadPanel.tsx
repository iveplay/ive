import { memo, useState, useRef, useCallback, DragEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { DraggableModal } from '@/components/draggableModal/DraggableModal'
import { useHandyStore } from '@/store/useHandyStore'
import styles from './LoadPanel.module.scss'

export const LoadPanel = memo(() => {
  const [dragActive, setDragActive] = useState(false)
  const [script, setScript] = useState<{ url: string; script: string | null }>({
    url: '',
    script: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const dropAreaRef = useRef<HTMLDivElement>(null)

  const { uploadScriptUrl, saveCustomScriptMapping } = useHandyStore(
    useShallow((state) => ({
      uploadScriptUrl: state.uploadScriptUrl,
      saveCustomScriptMapping: state.saveCustomScriptMapping,
    })),
  )

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
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('text') ||
      e.dataTransfer.getData('text/plain')

    if (url) {
      processDroppedUrl(url)
    }
  }

  const loadAndPlay = async () => {
    if (!script.script || !script.url) return

    setIsLoading(true)
    try {
      const uploadedUrl = await uploadScriptUrl(script.script)

      if (uploadedUrl) {
        await saveCustomScriptMapping(script.url, uploadedUrl)

        window.open(script.url, '_blank')
      } else {
        throw new Error('Failed to upload script')
      }
    } catch (error) {
      console.error('Error loading script:', error)
      alert(
        'Upload failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DraggableModal
      headerContent='Load script'
      storageKey='ive-load-panel-position'
      bounds='#crx-root'
    >
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
          onClick={loadAndPlay}
          disabled={!script.script || !script.url || isLoading}
        >
          {isLoading ? 'Loading...' : 'Load and play'}
        </button>
      </div>
    </DraggableModal>
  )
})
