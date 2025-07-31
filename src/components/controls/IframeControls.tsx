import {
  IconRectangle,
  IconMaximize,
  IconX,
  IconGripHorizontal,
} from '@tabler/icons-react'
import clsx from 'clsx'
import styles from './Controls.module.scss'

type IframeControlsProps = {
  onClose: () => void
  onTheaterMode: () => void
  onFullscreen?: () => void
}

export const IframeControls = ({
  onClose,
  onTheaterMode,
  onFullscreen,
}: IframeControlsProps) => {
  return (
    <div className={`${styles.controls} ${styles.iframeControls}`}>
      <div className={styles.controlsBar}>
        <div className={styles.rightSection}>
          <button
            className={styles.controlButton}
            onClick={onTheaterMode}
            aria-label='Theater Mode'
          >
            <IconRectangle size={16} />
          </button>

          {onFullscreen && (
            <button
              className={styles.controlButton}
              onClick={onFullscreen}
              aria-label='Fullscreen'
            >
              <IconMaximize size={16} />
            </button>
          )}

          <button
            className={clsx(styles.controlButton, 'draggable-handle')}
            aria-label='Drag'
            style={{ cursor: 'move' }}
          >
            <IconGripHorizontal size={16} />
          </button>

          <button
            className={styles.controlButton}
            onClick={onClose}
            aria-label='Close'
          >
            <IconX size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
