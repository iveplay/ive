import { useState, memo, useRef, RefObject, useEffect, ReactNode } from 'react'
import Draggable from 'react-draggable'
import styles from './DraggableModal.module.scss'

type Position = {
  x: number
  y: number
}

type DraggableModalProps = {
  children: ReactNode
  className?: string
  headerContent?: ReactNode
  isExpanded?: boolean
  onExpandToggle?: (expanded: boolean) => void
  storageKey?: string
  bounds?: string
}

export const DraggableModal = memo(
  ({
    children,
    className = '',
    headerContent,
    isExpanded: externalIsExpanded,
    onExpandToggle,
    storageKey = 'draggable-panel-position',
    bounds = 'body',
  }: DraggableModalProps) => {
    const [isDragging, setIsDragging] = useState(false)
    const [controlledPosition, setControlledPosition] = useState<Position>({
      x: 0,
      y: 0,
    })
    const [internalIsExpanded, setInternalIsExpanded] = useState(true)
    const draggableRef = useRef<HTMLDivElement>(null)

    // Use either external or internal expand state
    const isExpanded =
      externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded

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
          console.error('Error loading panel position:', error)
        }
      }

      loadSavedPosition()
    }, [storageKey])

    const savePosition = async (position: Position) => {
      try {
        await chrome.storage.local.set({
          [storageKey]: position,
        })
      } catch (error) {
        console.error('Error saving panel position:', error)
      }
    }

    const handleExpandToggle = () => {
      if (!isDragging) {
        const newExpandedState = !isExpanded
        setInternalIsExpanded(newExpandedState)
        if (onExpandToggle) {
          onExpandToggle(newExpandedState)
        }
      }
    }

    return (
      <Draggable
        nodeRef={draggableRef as RefObject<HTMLDivElement>}
        handle='.draggable-handle'
        bounds={bounds}
        position={controlledPosition}
        onStop={(_, position) => {
          setTimeout(() => {
            setIsDragging(false)
            // Save position when dragging stops
            savePosition(position)
          }, 1)
        }}
        onDrag={(_, position) => {
          const { x, y } = position
          setIsDragging(true)
          setControlledPosition({ x, y })
        }}
      >
        <div
          ref={draggableRef}
          className={`${styles.draggableModal} ${isExpanded ? styles.expanded : ''} ${className}`}
        >
          <div
            className={`draggable-handle ${styles.header}`}
            onClick={handleExpandToggle}
          >
            {headerContent}
            <div className={styles.expandButton}>{isExpanded ? '▲' : '▼'}</div>
          </div>

          {isExpanded && (
            <div className={styles.expandedContent}>{children}</div>
          )}
        </div>
      </Draggable>
    )
  },
)
