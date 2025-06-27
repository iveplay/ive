import {
  useState,
  useEffect,
  ReactNode,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'
import Draggable from 'react-draggable'
import styles from './DraggableWrapper.module.scss'

type Position = {
  x: number
  y: number
}

type Size = {
  width: number
  height: number
}

type DraggableWrapperProps = {
  children: ReactNode
  className?: string
  headerContent?: ReactNode
  onClose?: () => void
  storageKey?: string
  bounds?: string
  defaultWidth?: number
  resizable?: boolean
  showResizeHandle?: boolean
  isVerticalAspectRatio: boolean
}

export interface DraggableWrapperRef {
  setSize: (width: number, height?: number, isVertical?: boolean) => void
}

export const DraggableWrapper = forwardRef<
  DraggableWrapperRef,
  DraggableWrapperProps
>(
  (
    {
      children,
      storageKey = 'draggablePosition',
      bounds = 'body',
      defaultWidth = 640,
      resizable = true,
      showResizeHandle = true,
      isVerticalAspectRatio,
    },
    ref,
  ) => {
    const [controlledPosition, setControlledPosition] = useState<Position>({
      x: 50,
      y: 50,
    })
    const [size, setSize] = useState<Size>({
      width: defaultWidth,
      height: defaultWidth * (9 / 16),
    })
    const [isResizing, setIsResizing] = useState(false)
    const draggableRef = useRef<HTMLDivElement>(null)
    const resizeRef = useRef<{
      startX: number
      startY: number
      startWidth: number
      startHeight: number
    } | null>(null)

    const getAspectRatio = useCallback((isVertical: boolean) => {
      return isVertical ? 16 / 9 : 9 / 16
    }, [])

    const calculateHeight = useCallback(
      (currentWidth: number, isVertical: boolean) => {
        return currentWidth * getAspectRatio(isVertical)
      },
      [getAspectRatio],
    )

    const calculateWidth = useCallback(
      (currentHeight: number, isVertical: boolean) => {
        return currentHeight / getAspectRatio(isVertical)
      },
      [getAspectRatio],
    )

    // Expose resize functions
    useImperativeHandle(ref, () => ({
      setSize: (
        width: number,
        height?: number,
        isVerticalParam: boolean = isVerticalAspectRatio,
      ) => {
        // Renamed parameter
        let newWidth = Math.max(320, width)
        let newHeight = height
          ? Math.max(180, height)
          : calculateHeight(newWidth, isVerticalParam)
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        if (newWidth > viewportWidth) {
          newWidth = viewportWidth
          newHeight = calculateHeight(newWidth, isVerticalParam)
        }

        if (newHeight > viewportHeight) {
          newHeight = viewportHeight
          newWidth = calculateWidth(newHeight, isVerticalParam)
        }

        setSize({ width: newWidth, height: newHeight })
      },
    }))

    useEffect(() => {
      const loadSavedState = async () => {
        try {
          const storage = await chrome.storage.local.get([
            storageKey,
            `${storageKey}_size`,
          ])
          const savedPosition = storage[storageKey]
          const savedSize = storage[`${storageKey}_size`]

          if (
            savedPosition &&
            typeof savedPosition.x === 'number' &&
            typeof savedPosition.y === 'number'
          ) {
            setControlledPosition(savedPosition)
          }

          if (
            savedSize &&
            typeof savedSize.width === 'number' &&
            typeof savedSize.height === 'number'
          ) {
            const adjustedHeight = calculateHeight(
              savedSize.width,
              isVerticalAspectRatio,
            )
            setSize({ width: savedSize.width, height: adjustedHeight })
          } else {
            setSize({
              width: defaultWidth,
              height: calculateHeight(defaultWidth, isVerticalAspectRatio),
            })
          }
        } catch (error) {
          console.error('Error loading state:', error)
        }
      }

      loadSavedState()
    }, [storageKey, defaultWidth, isVerticalAspectRatio, calculateHeight])

    const saveState = useCallback(
      async (position: Position, currentSize: Size) => {
        try {
          await chrome.storage.local.set({
            [storageKey]: position,
            [`${storageKey}_size`]: currentSize,
          })
        } catch (error) {
          console.error('Error saving state:', error)
        }
      },
      [storageKey],
    )

    const handleMouseDownResize = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        resizeRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startWidth: size.width,
          startHeight: size.height,
        }
      },
      [size],
    )

    useEffect(() => {
      if (!isResizing) return

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return

        const deltaX = e.clientX - resizeRef.current.startX
        const deltaY = e.clientY - resizeRef.current.startY

        // Use the larger delta to maintain aspect ratio
        const currentAspectRatio = getAspectRatio(isVerticalAspectRatio)
        const delta = Math.max(deltaX, deltaY / currentAspectRatio)

        let newWidth = Math.max(320, resizeRef.current.startWidth + delta)
        let newHeight = calculateHeight(newWidth, isVerticalAspectRatio)

        // Ensure it doesn't exceed viewport
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        if (newWidth > viewportWidth) {
          newWidth = viewportWidth
          newHeight = calculateHeight(newWidth, isVerticalAspectRatio)
        }

        if (newHeight > viewportHeight) {
          newHeight = viewportHeight
          newWidth = calculateWidth(newHeight, isVerticalAspectRatio)
        }

        setSize({ width: newWidth, height: newHeight })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        resizeRef.current = null
        saveState(controlledPosition, size)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }, [
      isResizing,
      controlledPosition,
      size,
      saveState,
      isVerticalAspectRatio,
      calculateHeight,
      calculateWidth,
      getAspectRatio,
    ])

    useEffect(() => {
      const handleWindowResizeAndAspectRatioChange = () => {
        if (!draggableRef.current) return

        const position = { ...controlledPosition }
        const currentSize = { ...size }

        let needsUpdate = false
        const currentCalculatedHeight = calculateHeight(
          currentSize.width,
          isVerticalAspectRatio,
        )

        // Check if height needs adjustment based on current width and aspect ratio
        if (
          Math.abs(currentSize.height - currentCalculatedHeight) > 1 ||
          currentSize.width === defaultWidth
        ) {
          currentSize.height = currentCalculatedHeight
          needsUpdate = true
        }

        // Get available viewport dimensions (excluding scrollbars)
        const viewportWidth = document.documentElement.clientWidth
        const viewportHeight = document.documentElement.clientHeight

        // Check if size needs to be reduced
        if (currentSize.width > viewportWidth) {
          currentSize.width = viewportWidth
          currentSize.height = calculateHeight(
            currentSize.width,
            isVerticalAspectRatio,
          )
          needsUpdate = true
        }

        if (currentSize.height > viewportHeight) {
          currentSize.height = viewportHeight
          currentSize.width = calculateWidth(
            currentSize.height,
            isVerticalAspectRatio,
          )
          needsUpdate = true
        }

        // Check if position needs adjustment
        if (position.x + currentSize.width > viewportWidth) {
          position.x = Math.max(0, viewportWidth - currentSize.width)
          needsUpdate = true
        }

        if (position.x < 0) {
          position.x = 0
          needsUpdate = true
        }

        if (position.y + currentSize.height > viewportHeight) {
          position.y = Math.max(0, viewportHeight - currentSize.height)
          needsUpdate = true
        }

        if (position.y < 0) {
          position.y = 0
          needsUpdate = true
        }

        if (needsUpdate) {
          setControlledPosition(position)
          setSize(currentSize)
          saveState(position, currentSize)
        }
      }

      handleWindowResizeAndAspectRatioChange()
      window.addEventListener('resize', handleWindowResizeAndAspectRatioChange)
      return () =>
        window.removeEventListener(
          'resize',
          handleWindowResizeAndAspectRatioChange,
        )
    }, [
      controlledPosition,
      size,
      saveState,
      isVerticalAspectRatio,
      calculateHeight,
      calculateWidth,
      defaultWidth,
    ])

    return (
      <Draggable
        nodeRef={draggableRef as React.RefObject<HTMLDivElement>}
        handle='.draggable-handle'
        bounds={bounds}
        position={controlledPosition}
        disabled={isResizing}
        onStop={(_, position) => {
          saveState(position, size)
        }}
        onDrag={(_, position) => {
          setControlledPosition({ x: position.x, y: position.y })
        }}
      >
        <div
          ref={draggableRef}
          className={styles.draggableWrapper}
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            position: 'relative',
            cursor: isResizing ? 'se-resize' : 'auto',
          }}
        >
          {children}
          {resizable && (
            <div
              className={styles.resizeHandle}
              onMouseDown={handleMouseDownResize}
              style={{
                zIndex: 1,
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: '20px',
                height: '20px',
                cursor: 'se-resize',
                color: '#fff',
                backgroundColor: 'transparent',
                opacity: showResizeHandle ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            >
              <svg
                width='20'
                height='20'
                viewBox='0 0 20 20'
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                }}
              >
                <path
                  d='M 5,15 L 15,5 M 10,15 L 15,10 M 15,15 L 15,15'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  fill='none'
                  opacity='0.5'
                />
              </svg>
            </div>
          )}
        </div>
      </Draggable>
    )
  },
)
