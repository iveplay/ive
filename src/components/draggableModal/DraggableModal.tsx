import {
  useState,
  memo,
  useRef,
  RefObject,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
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
    const contentRef = useRef<HTMLDivElement>(null)

    // Use either external or internal expand state
    const isExpanded =
      externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded

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
          console.error('Error loading panel position:', error)
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
          console.error('Error saving panel position:', error)
        }
      },
      [storageKey],
    )

    // Handle window resize to keep modal in bounds
    useEffect(() => {
      const handleWindowResize = () => {
        if (!draggableRef.current) return

        const position = { ...controlledPosition }
        let needsUpdate = false

        // Get the dimensions of the modal
        const modalRect = draggableRef.current.getBoundingClientRect()
        const modalWidth = modalRect.width
        const modalHeight = modalRect.height

        // Get the available viewport dimensions
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Check if position needs adjustment for X axis
        if (position.x + modalWidth > viewportWidth) {
          position.x = Math.max(0, viewportWidth - modalWidth)
          needsUpdate = true
        }

        if (position.x < 0) {
          position.x = 0
          needsUpdate = true
        }

        // Check if position needs adjustment for Y axis
        if (position.y + modalHeight > viewportHeight) {
          position.y = Math.max(0, viewportHeight - modalHeight)
          needsUpdate = true
        }

        if (position.y < 0) {
          position.y = 0
          needsUpdate = true
        }

        // Apply the adjusted position if needed
        if (needsUpdate) {
          setControlledPosition(position)
          savePosition(position)
        }
      }

      // Run once on mount and whenever window size changes
      handleWindowResize()
      window.addEventListener('resize', handleWindowResize)
      // Also run when expanded state changes, as this affects modal height
      if (isExpanded !== undefined) {
        const timeout = setTimeout(handleWindowResize, 100)
        return () => {
          clearTimeout(timeout)
          window.removeEventListener('resize', handleWindowResize)
        }
      }

      return () => window.removeEventListener('resize', handleWindowResize)
    }, [controlledPosition, isExpanded, savePosition])

    // Adjust position when expanding near bottom of screen
    useEffect(() => {
      if (isExpanded && contentRef.current && draggableRef.current) {
        // Give time for the content to render fully before measuring
        setTimeout(() => {
          const modalRect = draggableRef.current?.getBoundingClientRect()
          const headerHeight =
            (modalRect?.height || 0) - (contentRef.current?.offsetHeight || 0)
          const expandedHeight =
            headerHeight + (contentRef.current?.offsetHeight || 0)
          const viewportHeight = window.innerHeight

          // Check if the expanded modal would go below the viewport
          if ((modalRect?.top || 0) + expandedHeight > viewportHeight) {
            // Calculate how much we need to move up to fit the content
            const overflow =
              (modalRect?.top || 0) + expandedHeight - viewportHeight
            const newY = Math.max(0, controlledPosition.y - overflow - 10) // 10px buffer

            // Only update if position needs to change significantly
            if (Math.abs(controlledPosition.y - newY) > 5) {
              const newPosition = { ...controlledPosition, y: newY }
              setControlledPosition(newPosition)
              savePosition(newPosition)
            }
          }
        }, 50) // Small delay to ensure content is rendered
      }
    }, [controlledPosition, isExpanded, savePosition])

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
            <div ref={contentRef} className={styles.expandedContent}>
              {children}
            </div>
          )}
        </div>
      </Draggable>
    )
  },
)
