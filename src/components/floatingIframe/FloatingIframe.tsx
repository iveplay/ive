import { useRef, useEffect } from 'react'
import {
  DraggableWrapper,
  DraggableWrapperRef,
} from '@/components/draggableWrapper/DraggableWrapper'
import { useVideoStore } from '@/store/useVideoStore'
import { IframeControls } from '../controls/IframeControls'
import styles from './FloatingIframe.module.scss'

type FloatingIframeProps = {
  iframeElement: HTMLIFrameElement | null
}

export const FloatingIframe = ({ iframeElement }: FloatingIframeProps) => {
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  const draggableRef = useRef<DraggableWrapperRef>(null)
  const originalIframeRef = useRef<{
    iframe: HTMLIFrameElement
    parent: Element
    nextSibling: Node | null
  } | null>(null)

  const setIsFloating = useVideoStore((state) => state.setIsFloating)

  // Move iframe to floating window
  useEffect(() => {
    if (iframeContainerRef.current) {
      if (iframeElement && iframeElement.parentElement) {
        // Store original position
        const parentInfo = {
          iframe: iframeElement,
          parent: iframeElement.parentElement,
          nextSibling: iframeElement.nextSibling,
        }
        originalIframeRef.current = parentInfo

        // Move the actual iframe to floating window
        iframeElement.style.width = '100%'
        iframeElement.style.height = '100%'
        iframeElement.style.border = 'none'

        iframeContainerRef.current.appendChild(iframeElement)

        return () => {
          // Restore iframe to original position on cleanup
          if (parentInfo.nextSibling) {
            parentInfo.parent.insertBefore(
              iframeElement,
              parentInfo.nextSibling,
            )
          } else {
            parentInfo.parent.appendChild(iframeElement)
          }
          // Reset iframe styles
          iframeElement.style.width = ''
          iframeElement.style.height = ''
          iframeElement.style.border = ''
        }
      }
    }
  }, [iframeElement])

  const handleClose = () => {
    // Restore original iframe
    if (originalIframeRef.current) {
      originalIframeRef.current.iframe.style.display = ''
    }
    setIsFloating(false)
  }

  return (
    <DraggableWrapper
      ref={draggableRef}
      storageKey='floating-iframe-position'
      showResizeHandle={true}
      isVerticalAspectRatio={false}
    >
      <div
        ref={iframeContainerRef}
        className={styles.iframeContainer}
        style={{ cursor: 'pointer' }}
      />
      <IframeControls
        onClose={handleClose}
        onTheaterMode={() =>
          draggableRef.current?.setSize(window.innerWidth, window.innerHeight)
        }
        onFullscreen={() => {
          if (!iframeElement) return

          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            iframeElement.requestFullscreen()
          }
        }}
      />
    </DraggableWrapper>
  )
}
