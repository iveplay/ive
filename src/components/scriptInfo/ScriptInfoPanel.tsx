import { useState, memo } from 'react'
import { Anchorme } from 'react-anchorme'
import { ScriptMetadata } from '@/pages/content/ContentWrapper'
import styles from './ScriptInfoPanel.module.scss'

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
    const [isExpanded, setIsExpanded] = useState(true)
    const getStatusText = () => {
      if (!isConnected) return 'Disconnected'
      if (!isScriptSetup) return 'Setting up...'
      if (isPlaying) return 'Syncing'
      return 'Click to sync'
    }

    return (
      <div
        className={`${styles.floatingPanel} ${
          !isConnected
            ? styles.disconnected
            : isPlaying
              ? styles.playing
              : styles.connected
        } ${isExpanded ? styles.expanded : ''}`}
      >
        <div
          className={styles.header}
          onClick={() => {
            setIsExpanded(!isExpanded)
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
    )
  },
)
