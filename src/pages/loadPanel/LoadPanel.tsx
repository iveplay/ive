import { memo } from 'react'
import { DraggableModal } from '@/components/draggableModal/DraggableModal'
import styles from './LoadPanel.module.scss'

export const LoadPanel = memo(() => {
  return (
    <DraggableModal
      headerContent='Load script'
      storageKey='ive-panel-position'
      bounds='#crx-root'
    >
      <div className={styles.loadPanel}>
        <h4 className={styles.title}>Drag script and url to load</h4>
      </div>
    </DraggableModal>
  )
})
