import clsx from 'clsx'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import {
  DraggableWrapper,
  DraggableWrapperRef,
} from '@/components/draggableWrapper/DraggableWrapper'
import { useVideoStore } from '@/store/useVideoStore'
import { Controls } from '../controls/Controls'
import styles from './FloatingVideo.module.scss'

type FloatingVideoProps = {
  videoElement: HTMLVideoElement
}

export const FloatingVideo = ({ videoElement }: FloatingVideoProps) => {
  const [showControls, setShowControls] = useState(true)
  const [isVertical, setIsVertical] = useState(false)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const draggableRef = useRef<DraggableWrapperRef>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>(null)

  const { isBuffering, isPlaying, setIsFloating } = useVideoStore(
    useShallow((state) => ({
      isBuffering: state.isBuffering,
      isPlaying: state.isPlaying,
      setIsFloating: state.setIsFloating,
    })),
  )

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

    // Only hide controls if video is playing
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  // Always show controls when paused
  useEffect(() => {
    if (!isPlaying) {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
      setShowControls(true)
    } else {
      // Reset the timer when video starts playing
      resetHideTimer()
    }
  }, [isPlaying, resetHideTimer])

  const handleVideoClick = useCallback(() => {
    if (!videoElement) return

    if (videoElement.paused) {
      videoElement.play()
    } else {
      videoElement.pause()
    }
  }, [videoElement])

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
    <DraggableWrapper
      ref={draggableRef}
      storageKey='floating-video-position'
      showResizeHandle={showControls}
      isVerticalAspectRatio={isVertical}
    >
      <div
        ref={videoContainerRef}
        className={clsx(styles.videoContainer, {
          [styles.verticalVideo]: isVertical,
        })}
        onMouseMove={resetHideTimer}
        onClick={handleVideoClick}
        style={{ cursor: 'pointer' }}
      >
        {isBuffering && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
      <Controls
        show={showControls}
        onClose={handleClose}
        onTheaterMode={() =>
          draggableRef.current?.setSize(
            window.innerWidth,
            window.innerHeight,
            isVertical,
          )
        }
        isVertical={isVertical}
        onOrientationChange={setIsVertical}
      />
    </DraggableWrapper>
  )
}
