import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { DraggableModal } from '@/components/draggableModal/DraggableModal'
import styles from './LoadPanel.module.scss'

export const LoadPanel = memo(() => {
  const [dragActive, setDragActive] = useState(false)
  const [script, setScript] = useState<{ url: string; script: string }>()
  const dropAreaRef = useRef<HTMLDivElement>(null)

  const processDroppedUrl = useCallback(
    (url: string) => {
      if (url.endsWith('.funscript') || url.endsWith('.csv')) {
        setScript({ url: script?.url ?? '', script: url })
      } else {
        setScript({ url, script: script?.script ?? '' })
      }
    },
    [script],
  )

  useEffect(() => {
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

      // Check if text/uri-list or text/plain is in the dataTransfer
      const url =
        e.dataTransfer?.getData('text/uri-list') ||
        e.dataTransfer?.getData('text') ||
        e.dataTransfer?.getData('text/plain')

      if (url) {
        processDroppedUrl(url)
      }
    }

    const dropArea = dropAreaRef.current
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver)
      dropArea.addEventListener('dragleave', handleDragLeave)
      dropArea.addEventListener('drop', handleDrop)
    }

    return () => {
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver)
        dropArea.removeEventListener('dragleave', handleDragLeave)
        dropArea.removeEventListener('drop', handleDrop)
      }
    }
  }, [processDroppedUrl])

  return (
    <DraggableModal
      headerContent='Load script'
      storageKey='ive-load-panel-position'
      bounds='#crx-root'
    >
      <div
        className={`${styles.loadPanel} ${dragActive ? styles.dragActive : ''}`}
      >
        <h4 className={styles.title}>Drag script or video URL here</h4>
        <div ref={dropAreaRef} className={styles.dropZone}>
          <p className={styles.dropInstructions}>
            {dragActive ? 'Drop now!' : 'Drag here'}
          </p>
          <p className={styles.dropScript}>{script?.script}</p>
          <p className={styles.dropScript}>{script?.url}</p>
        </div>
        <button
          className={styles.loadButton}
          onClick={() => {}}
          disabled={!script?.script && !script?.url}
        >
          Load and play
        </button>
      </div>
    </DraggableModal>
  )
})
