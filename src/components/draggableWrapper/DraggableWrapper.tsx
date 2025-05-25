import { useState, useRef, useEffect, ReactNode, useCallback } from 'react'
import Draggable from 'react-draggable'
import styles from './DraggableWrapper.module.scss'

type Position = {
  x: number
  y: number
}

type DraggableWrapperProps = {
  children: ReactNode
  className?: string
  headerContent?: ReactNode
  onClose?: () => void
  storageKey?: string
  bounds?: string
}

export const DraggableWrapper = ({
  children,
  className = '',
  headerContent,
  onClose,
  storageKey = 'floating-window-position',
  bounds = 'body',
}: DraggableWrapperProps) => {
  const [controlledPosition, setControlledPosition] = useState<Position>({
    x: 50,
    y: 50,
  })
  const draggableRef = useRef<HTMLDivElement>()

  // Load saved position
  useEffect(() => {
    const loadSavedPosition = async () => {
      try {
        const storage = await chrome.storage.local.get(storageKey)
        const savedPosition = storage[storageKey]

        if (
          savedPosition &&
          typeof savedPosition.x === 'number' &&
          typeof savedPosition.y === 'number'
        ) {
          setControlledPosition(savedPosition)
        }
      } catch (error) {
        console.error('Error loading position:', error)
      }
    }

    loadSavedPosition()
  }, [storageKey])

  const savePosition = useCallback(
    async (position: Position) => {
      try {
        await chrome.storage.local.set({
          [storageKey]: position,
        })
      } catch (error) {
        console.error('Error saving position:', error)
      }
    },
    [storageKey],
  )

  // Keep window in bounds on resize
  useEffect(() => {
    const handleWindowResize = () => {
      if (!draggableRef.current) return

      const position = { ...controlledPosition }
      let needsUpdate = false

      const modalRect = draggableRef.current.getBoundingClientRect()
      const modalWidth = modalRect.width
      const modalHeight = modalRect.height
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (position.x + modalWidth > viewportWidth) {
        position.x = Math.max(0, viewportWidth - modalWidth)
        needsUpdate = true
      }

      if (position.x < 0) {
        position.x = 0
        needsUpdate = true
      }

      if (position.y + modalHeight > viewportHeight) {
        position.y = Math.max(0, viewportHeight - modalHeight)
        needsUpdate = true
      }

      if (position.y < 0) {
        position.y = 0
        needsUpdate = true
      }

      if (needsUpdate) {
        setControlledPosition(position)
        savePosition(position)
      }
    }

    handleWindowResize()
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [controlledPosition, savePosition])

  return (
    <Draggable
      nodeRef={draggableRef}
      handle='.draggable-handle'
      bounds={bounds}
      position={controlledPosition}
      onStop={(_, position) => {
        savePosition(position)
      }}
      onDrag={(_, position) => {
        setControlledPosition({ x: position.x, y: position.y })
      }}
    >
      <div
        ref={draggableRef}
        className={`${styles.draggableWrapper} ${className}`}
      >
        <div className={`draggable-handle ${styles.header}`}>
          {headerContent || <span>Floating Window</span>}
          {onClose && (
            <button onClick={onClose} className={styles.closeButton}>
              ×
            </button>
          )}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </Draggable>
  )
}
