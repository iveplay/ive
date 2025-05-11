import clsx from 'clsx'
import { useState } from 'react'
import logoImg from '@/assets/logo.png'
import styles from './IvdbPanel.module.scss'

export const IvdbPanel = () => {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <button
      className={clsx(styles.openPanel, { [styles.loading]: isLoading })}
      onClick={() => {}}
      disabled={isLoading}
    >
      <img
        src={chrome.runtime.getURL(logoImg)}
        alt='IVE'
        className={styles.logo}
      />
    </button>
  )
}
