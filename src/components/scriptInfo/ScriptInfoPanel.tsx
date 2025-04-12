import { useState, memo, useRef, RefObject, useEffect } from 'react'
import { Anchorme } from 'react-anchorme'
import Draggable from 'react-draggable'
import { ScriptMetadata } from '@/pages/content/ContentWrapper'
import styles from './ScriptInfoPanel.module.scss'

type Position = {
  x: number
  y: number
}

const POSITION_STORAGE_KEY = 'ive-panel-position'

type ScriptInfoPanelProps = {
  isConnected: boolean
  isPlaying: boolean
  isScriptSetup: boolean
  scriptMetadata: ScriptMetadata | null
  onSyncClick: () => void
  onStopClick: () => void
}

export const ScriptInfoPanel = memo(
  ({
    isConnected,
    isPlaying,
    isScriptSetup,
    scriptMetadata,
    onSyncClick,
    onStopClick,
  }: ScriptInfoPanelProps) => {
    const [isDragging, setIsDragging] = useState(false)
    const [controlledPosition, setControlledPosition] = useState<Position>({
      x: 0,
      y: 0,
    })
    const draggableRef = useRef<HTMLDivElement>(null)
    const [isExpanded, setIsExpanded] = useState(true)

    useEffect(() => {
      const loadSavedPosition = async () => {
        try {
          const storage = await chrome.storage.local.get(POSITION_STORAGE_KEY)
          const savedPosition = storage[POSITION_STORAGE_KEY]

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
    }, [])

    const savePosition = async (position: Position) => {
      try {
        await chrome.storage.local.set({
          [POSITION_STORAGE_KEY]: position,
        })
      } catch (error) {
        console.error('Error saving panel position:', error)
      }
    }

    const getStatusText = () => {
      if (!isConnected) return 'Disconnected'
      if (!isScriptSetup) return 'Setting up...'
      if (isPlaying) return 'Syncing'
      return 'Click to sync'
    }

    return (
      <Draggable
        nodeRef={draggableRef as RefObject<HTMLDivElement>}
        handle='#handle'
        bounds='#crx-root'
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
          className={`${styles.floatingPanel} ${
            !isConnected
              ? styles.disconnected
              : isPlaying
                ? styles.playing
                : styles.connected
          } ${isExpanded ? styles.expanded : ''}`}
        >
          <div
            id='handle'
            className={styles.header}
            onClick={() => {
              if (!isDragging) {
                setIsExpanded(!isExpanded)
              }
            }}
          >
            <div className={styles.statusSection}>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>{getStatusText()}</span>
            </div>
            <div className={styles.expandButton}>{isExpanded ? '▲' : '▼'}</div>
          </div>

          {isExpanded && (
            <div className={styles.expandedContent}>
              {scriptMetadata && (
                <div className={styles.creatorInfo}>
                  <h4 className={styles.creatorName}>
                    Scripted by {scriptMetadata.user.name}
                  </h4>
                  {(scriptMetadata.user.bio || scriptMetadata.description) && (
                    <p className={styles.creatorBio}>
                      <Anchorme target='_blank'>
                        {scriptMetadata.user.bio || scriptMetadata.description}
                      </Anchorme>
                    </p>
                  )}
                  {scriptMetadata.user.supportUrl && (
                    <a
                      href={scriptMetadata.user.supportUrl}
                      target='_blank'
                      className={styles.supportLink}
                    >
                      Support Creator
                    </a>
                  )}
                </div>
              )}

              <div className={styles.buttonContainer}>
                <button
                  className={styles.syncButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSyncClick()
                  }}
                >
                  {isPlaying ? 'Resync' : 'Start Sync'}
                </button>

                <button
                  className={styles.stopButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStopClick()
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      </Draggable>
    )
  },
)
