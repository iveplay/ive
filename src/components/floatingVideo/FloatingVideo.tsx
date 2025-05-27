import { useState, useRef, useEffect, useCallback } from 'react'
import { DraggableWrapper } from '@/components/draggableWrapper/DraggableWrapper'
import { useVideoStore } from '@/store/useVideoStore'
import { Controls } from '../controls/Controls'
import styles from './FloatingVideo.module.scss'

type FloatingVideoProps = {
  videoElement: HTMLVideoElement
}

export const FloatingVideo = ({ videoElement }: FloatingVideoProps) => {
  const [showControls, setShowControls] = useState(true)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>(null)

  const setIsFloating = useVideoStore((state) => state.setIsFloating)

  const [originalParent, setOriginalParent] = useState<{
    parent: Element
    nextSibling: Node | null
  } | null>(null)

  // Move video element to floating window
  useEffect(() => {
    if (videoContainerRef.current && videoElement.parentElement) {
      // Store original position
      const parentInfo = {
        parent: videoElement.parentElement,
        nextSibling: videoElement.nextSibling,
      }
      setOriginalParent(parentInfo)

      // Move video to floating window
      videoContainerRef.current.appendChild(videoElement)

      return () => {
        // Restore video to original position on cleanup
        if (parentInfo.nextSibling) {
          parentInfo.parent.insertBefore(videoElement, parentInfo.nextSibling)
        } else {
          parentInfo.parent.appendChild(videoElement)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetHideTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }

    setShowControls(true)
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  const handleClose = () => {
    // Restore video to original position before closing
    if (originalParent) {
      if (originalParent.nextSibling) {
        originalParent.parent.insertBefore(
          videoElement,
          originalParent.nextSibling,
        )
      } else {
        originalParent.parent.appendChild(videoElement)
      }
    }

    setIsFloating(false)
  }

  return (
    <DraggableWrapper storageKey='floating-video-position'>
      <div
        ref={videoContainerRef}
        className={styles.videoContainer}
        onMouseMove={resetHideTimer}
      />
      <Controls
        show={showControls}
        onClose={handleClose}
        onHover={resetHideTimer}
      />
    </DraggableWrapper>
  )
}
